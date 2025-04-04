// heatmap.js

class Heatmap {
    /**
     * Create a heatmap comparing magnitude and depth.
     * @param {Object} _config - Configuration object.
     * @param {string} _config.parentElement - The DOM element selector (e.g., "#heatmap").
     * @param {number} _config.width - Width of the heatmap SVG.
     * @param {number} _config.height - Height of the heatmap SVG.
     * @param {Object} _config.margin - Margin object with {top, right, bottom, left}.
     * @param {number} _config.xBins - Number of bins along the magnitude axis.
     * @param {number} _config.yBins - Number of bins along the depth axis.
     * @param {Function} [_config.onBinSelection] - Callback called with filtered data when bins are selected.
     * @param {Array} _data - Data array (each object must have numeric attributes 'mag' and 'depth').
     * @param {Array} _config.xDom - Optional x domain for magnitude (e.g., [min, max]). If not provided, it will be calculated from the data.
     * @param {Array} _config.yDom - Optional y domain for depth (e.g., [min, max]). If not provided, it will be calculated from the data.
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            width: _config.width || 500,
            height: _config.height || 500,
            margin: _config.margin || { top: 20, right: 20, bottom: 40, left: 40 },
            xBins: _config.xBins || 20,
            yBins: _config.yBins || 20,
            onBinSelection: _config.onBinSelection || function(filteredData) { },
            xDom: _config.xDom || d3.extent(_data, d => d.mag), // Use provided x domain or calculate from data
            yDom: _config.yDom || d3.extent(_data, d => d.depth) // Use provided y domain or calculate from data
        };
        this.data = _data;
        this.initVis();
    }

    initVis() {
        let vis = this;
        // Compute inner dimensions.
        vis.innerWidth = vis.config.width - vis.config.margin.left - vis.config.margin.right;
        vis.innerHeight = vis.config.height - vis.config.margin.top - vis.config.margin.bottom;

        // Create the main SVG container and group for the chart.
        vis.svg = d3.select(vis.config.parentElement)
            .append("svg")
            .attr("width", vis.config.width)
            .attr("height", vis.config.height)
            .style("background-color", "rgba(255, 255, 255, 0.6)")
            .style("border", "1px solid black")
            .style("border-radius", "5px");

        vis.chart = vis.svg.append("g")
            .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Compute full extents for the data.
        // let xDomain = d3.extent(vis.data, d => d.mag);
        // let yDomain = d3.extent(vis.data, d => d.depth);
        let xDomain = vis.config.xDom;
        let yDomain = vis.config.yDom;

        // Round the maximum up to ensure all data are included.
        xDomain[1] = Math.ceil(xDomain[1]) + 1;
        xDomain[0] = Math.floor(xDomain[0]);
        yDomain[1] = Math.ceil(yDomain[1] / 100) * 100;

        // Create scales using the full (rounded) extents.
        vis.xScale = d3.scaleLinear()
            .domain(xDomain)
            .range([0, vis.innerWidth]);

        vis.yScale = d3.scaleLinear()
            .domain(yDomain)
            .range([vis.innerHeight, 0]);

        // Generate tick arrays.
        let xTicks = d3.range(xDomain[0], xDomain[1]); // whole numbers
        let yTicks = d3.range(0, yDomain[1] + 1, 100);       // multiples of 100 starting at 0

        // Force the scales to exactly match the tick boundaries.
        vis.xScale.domain([xTicks[0], xTicks[xTicks.length - 1]]);
        vis.yScale.domain([yTicks[0], yTicks[yTicks.length - 1]]);

        // Create axes.
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickValues(xTicks)
            .tickFormat(d3.format("d"));
        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickValues(yTicks)
            .tickFormat(d3.format("d"));

        // Append the x-axis.
        vis.chart.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${vis.innerHeight})`)
            .call(vis.xAxis)
            .append("text")
            .attr("x", vis.innerWidth / 2)
            .attr("y", 35)
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .text("Magnitude");

        // Append the y-axis.
        let yAxisGroup = vis.chart.append("g")
            .attr("class", "y-axis")
            .call(vis.yAxis);
        yAxisGroup.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -vis.innerHeight / 2)
            .attr("y", -35)
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .text("Depth (km)");
        // Raise the y-axis so it appears above the bins.
        yAxisGroup.raise();

        // Use the tick arrays as bin thresholds.
        vis.xThresholds = xTicks;
        vis.yThresholds = yTicks;

        // Create an array to store each 2D bin and initialize selection flag to false.
        vis.bins = [];
        for (let i = 0; i < vis.xThresholds.length - 1; i++) {
            for (let j = 0; j < vis.yThresholds.length - 1; j++) {
                vis.bins.push({
                    x0: vis.xThresholds[i],
                    x1: vis.xThresholds[i + 1],
                    y0: vis.yThresholds[j],
                    y1: vis.yThresholds[j + 1],
                    count: 0,
                    selected: false
                });
            }
        }

        // Count data points in each bin.
        vis.data.forEach(d => {
            let xBin = vis.xThresholds.findIndex((threshold, i) => {
                if (i < vis.xThresholds.length - 1) {
                    return d.mag >= threshold && d.mag < vis.xThresholds[i + 1];
                }
            });
            let yBin = vis.yThresholds.findIndex((threshold, j) => {
                if (j < vis.yThresholds.length - 1) {
                    return d.depth >= threshold && d.depth < vis.yThresholds[j + 1];
                }
            });
            if (d.mag === vis.xThresholds[vis.xThresholds.length - 1])
                xBin = vis.xThresholds.length - 2;
            if (d.depth === vis.yThresholds[vis.yThresholds.length - 1])
                yBin = vis.yThresholds.length - 2;
            if (xBin >= 0 && yBin >= 0) {
                let binIndex = xBin * (vis.yThresholds.length - 1) + yBin;
                vis.bins[binIndex].count += 1;
            }
        });

        // Determine maximum count for the color scale.
        vis.maxCount = d3.max(vis.bins, d => d.count);

        // Create a color scale for the heatmap.
        vis.heatColor = d3.scaleSequential(d3.interpolateOrRd)
            .domain([0, vis.maxCount]);

        // Define a gap (in pixels) to create separation between bins.
        let gap = 4;

        // Draw the heatmap as rectangles.
        let binRects = vis.chart.selectAll(".heat-rect")
            .data(vis.bins)
            .enter()
            .append("rect")
            .attr("id", (d, i) => `heat-rect-${i}`) // Add this line
            .attr("class", "heat-rect")
            .attr("x", d => vis.xScale(d.x0) + gap / 2)
            .attr("y", d => vis.yScale(d.y1) + gap / 2)
            .attr("width", d => (vis.xScale(d.x1) - vis.xScale(d.x0)) - gap)
            .attr("height", d => (vis.yScale(d.y0) - vis.yScale(d.y1)) - gap)
            .attr("fill", d => vis.heatColor(d.count))
            .style("cursor", "pointer")
            // Make bins clickable: toggle selection and update styling.
            .on("click", function(event, d) {
                event.stopPropagation();
                d.selected = !d.selected;
                d3.select(this)
                    .attr("stroke", d.selected ? "black" : "none")
                    .attr("stroke-width", d.selected ? 2 : 0);
                vis.updateHeatmapSelectionLocalStorage();
                // Recompute filtered data based on selected bins.
                vis.selectedBins = vis.bins.filter(bin => bin.selected);
                vis.filterBinData();
            });

        // Append text labels on top of each bin.
        vis.chart.selectAll(".heat-label")
            .data(vis.bins)
            .enter()
            .append("text")
            .attr("class", "heat-label")
            .attr("x", d => vis.xScale(d.x0) + (vis.xScale(d.x1) - vis.xScale(d.x0)) / 2)
            .attr("y", d => vis.yScale(d.y1) + (vis.yScale(d.y0) - vis.yScale(d.y1)) / 2)
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text(d => d.count)
            .style("fill", "black")
            .style("font-size", "10px")
            .style("pointer-events", "none"); // Prevent the text from capturing mouse events.
    }

    /**
     * Update the heatmap based on new data (e.g., when the areaChart brush selection changes).
     * This method recalculates bin counts and updates the heatmap.
     * @param {Array} newData - The new (filtered) data array.
     */
    updateData(newData) {
        let vis = this;
        // Update the data.
        vis.data = newData;
        // Reset bin counts.
        vis.bins.forEach(bin => bin.count = 0);
        // Recount data points in each bin.
        vis.data.forEach(d => {
            let xBin = vis.xThresholds.findIndex((threshold, i) => {
                if (i < vis.xThresholds.length - 1) {
                    return d.mag >= threshold && d.mag < vis.xThresholds[i + 1];
                }
            });
            let yBin = vis.yThresholds.findIndex((threshold, j) => {
                if (j < vis.yThresholds.length - 1) {
                    return d.depth >= threshold && d.depth < vis.yThresholds[j + 1];
                }
            });
            if (d.mag === vis.xThresholds[vis.xThresholds.length - 1])
                xBin = vis.xThresholds.length - 2;
            if (d.depth === vis.yThresholds[vis.yThresholds.length - 1])
                yBin = vis.yThresholds.length - 2;
            if (xBin >= 0 && yBin >= 0) {
                let binIndex = xBin * (vis.yThresholds.length - 1) + yBin;
                vis.bins[binIndex].count += 1;
            }
        });
        // Update maximum count and color scale domain.
        vis.maxCount = d3.max(vis.bins, d => d.count);
        vis.heatColor.domain([0, vis.maxCount]);
    
        vis.filterBinData();
    
        // Update rectangle fill colors.
        vis.chart.selectAll(".heat-rect")
            .data(vis.bins)
            .transition().duration(200)
            .attr("fill", d => vis.heatColor(d.count));
    
        // Update text labels.
        vis.chart.selectAll(".heat-label")
            .data(vis.bins)
            .transition().duration(200)
            .text(d => d.count);
    
        // Restore persisted selection from global localStorage key.
        vis.restoreHeatmapSelection();
    }

    /**
     * Clears any bin selections and resets the visual styling.
     */
    clearSelections() {
        let vis = this;
        vis.bins.forEach(bin => {
            bin.selected = false;
        });
        vis.chart.selectAll(".heat-rect")
            .attr("stroke", "none")
            .attr("stroke-width", 0);
    }

    filterBinData() {
      let vis = this;
      if (!vis.selectedBins || vis.selectedBins.length === 0) {
        vis.filteredData = vis.data;
      } else {
        vis.filteredData = vis.data.filter(point => {
          return vis.selectedBins.some(bin => {
            return point.mag >= bin.x0 && point.mag < bin.x1 &&
              point.depth >= bin.y0 && point.depth < bin.y1;
          });
        });
      }
      vis.config.onBinSelection(vis.filteredData);
    }

    // disable interaction with heatmap bins during animation
    disableBinClicks() {
        // Turn off pointer events for all the heatmap rectangles
        d3.selectAll('.heat-rect')
            .style('pointer-events', 'none')
            .style("cursor", "not-allowed");
    }
    enableBinClicks() {
        // Turn pointer events back on
        d3.selectAll('.heat-rect')
            .style('pointer-events', 'all')
            .style("cursor", "pointer");
    }

    updateHeatmapSelectionLocalStorage() {
        let vis = this;
        // Store an array of objects representing each selected bin.
        const selectedBins = vis.bins
            .filter(bin => bin.selected)
            .map(bin => ({
                x0: bin.x0,
                x1: bin.x1,
                y0: bin.y0,
                y1: bin.y1
            }));
        // Use a global key so that the selection persists regardless of year or map type.
        localStorage.setItem("heatmapSelection", JSON.stringify(selectedBins));
    }

    restoreHeatmapSelection() {
        let vis = this;
        const stored = localStorage.getItem("heatmapSelection");
        if (stored) {
            try {
                const storedBins = JSON.parse(stored);
                // Reset all bin selections.
                vis.bins.forEach(bin => bin.selected = false);
                // For each stored bin, find a matching bin in the current bins.
                storedBins.forEach(storedBin => {
                    const match = vis.bins.find(bin =>
                        bin.x0 === storedBin.x0 &&
                        bin.x1 === storedBin.x1 &&
                        bin.y0 === storedBin.y0 &&
                        bin.y1 === storedBin.y1
                    );
                    if (match) {
                        match.selected = true;
                        // Update corresponding rectangle style (using its index).
                        const index = vis.bins.indexOf(match);
                        d3.select(`#heat-rect-${index}`)
                            .attr("stroke", "black")
                            .attr("stroke-width", 2);
                    }
                });
                // Update localStorage to only include bins that still exist.
                const updatedSelection = vis.bins
                    .filter(bin => bin.selected)
                    .map(bin => ({
                        x0: bin.x0,
                        x1: bin.x1,
                        y0: bin.y0,
                        y1: bin.y1
                    }));
                localStorage.setItem("heatmapSelection", JSON.stringify(updatedSelection));
            } catch (e) {
                console.error("Error restoring heatmap selection:", e);
            }
        }
        // Update the selectedBins array and trigger filtering.
        vis.selectedBins = vis.bins.filter(bin => bin.selected);
        vis.filterBinData();
    }    
}
