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
     * @param {Array} _data - Data array (each object must have numeric attributes 'mag' and 'depth').
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            width: _config.width || 500,
            height: _config.height || 500,
            margin: _config.margin || { top: 20, right: 20, bottom: 40, left: 40 },
            xBins: _config.xBins || 20,
            yBins: _config.yBins || 20
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
            .attr("height", vis.config.height);

        vis.chart = vis.svg.append("g")
            .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Compute full extents for the data.
        let xDomain = d3.extent(vis.data, d => d.mag);
        let yDomain = d3.extent(vis.data, d => d.depth);

        // Round the maximum up to ensure all data are included.
        xDomain[1] = Math.ceil(xDomain[1]);
        yDomain[1] = Math.ceil(yDomain[1] / 100) * 100;

        // Create scales using the full (rounded) extents.
        vis.xScale = d3.scaleLinear()
            .domain(xDomain)
            .range([0, vis.innerWidth]);

        vis.yScale = d3.scaleLinear()
            .domain(yDomain)
            .range([vis.innerHeight, 0]);

        // Generate tick arrays.
        let xTicks = d3.range(xDomain[0], xDomain[1] + 1); // whole numbers
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

        // Create an array to store each 2D bin.
        vis.bins = [];
        for (let i = 0; i < vis.xThresholds.length - 1; i++) {
            for (let j = 0; j < vis.yThresholds.length - 1; j++) {
                vis.bins.push({
                    x0: vis.xThresholds[i],
                    x1: vis.xThresholds[i + 1],
                    y0: vis.yThresholds[j],
                    y1: vis.yThresholds[j + 1],
                    count: 0
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
            // If a data point equals the max value, assign it to the last bin.
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
        vis.chart.selectAll(".heat-rect")
            .data(vis.bins)
            .enter()
            .append("rect")
            .attr("class", "heat-rect")
            .attr("x", d => vis.xScale(d.x0) + gap / 2)
            .attr("y", d => vis.yScale(d.y1) + gap / 2)
            .attr("width", d => (vis.xScale(d.x1) - vis.xScale(d.x0)) - gap)
            .attr("height", d => (vis.yScale(d.y0) - vis.yScale(d.y1)) - gap)
            .attr("fill", d => vis.heatColor(d.count));

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
            .style("font-size", "10px");
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

        // Update rectangle fill colors.
        vis.chart.selectAll(".heat-rect")
            .data(vis.bins)
            .transition().duration(500)
            .attr("fill", d => vis.heatColor(d.count));

        // Update text labels.
        vis.chart.selectAll(".heat-label")
            .data(vis.bins)
            .transition().duration(500)
            .text(d => d.count);
    }
}
