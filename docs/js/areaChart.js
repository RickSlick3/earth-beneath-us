class AreaChart {

    /**
     * Class constructor for the area chart.
     * @param {Object} _config - Configuration object.
     * @param {Array} _data - Data array.
     * @param {Function} onBrushCallback - Callback function to update the map.
     */
    constructor(_config, _data, onBrushCallback) {
        this.config = {
            parentElement: _config.parentElement, // e.g., "#context"
            contextWidth: _config.contextWidth || 1000,
            contextHeight: _config.contextHeight || 100,
            margin: _config.margin || { top: 20, right: 60, bottom: 20, left: 45 }
        };
        this.data = _data;
        this.onBrushCallback = onBrushCallback; // Called when brush selection changes.
        this.maxBrushWidth = 211; // Maximum width of the brush selection in pixels
        this.canBrush = true; // Flag to indicate if brushing is enabled
        this.initVis();
    }


    /**
     * Initialize the area chart, scales, axes, and brushing.
     */
    initVis() {
        let vis = this;

        const containerWidth = vis.config.contextWidth + vis.config.margin.left + vis.config.margin.right;
        const containerHeight = vis.config.contextHeight + vis.config.margin.top + vis.config.margin.bottom;

        // Create the main SVG container.
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .style("border", "1px solid black")
            .style("border-radius", "5px");

        // Append a group for the chart.
        vis.context = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Define scales.
        vis.xScale = d3.scaleTime().range([0, vis.config.contextWidth]);
        vis.yScale = d3.scaleLinear().range([vis.config.contextHeight, 0]).nice();

        // Define axes.
        vis.xAxis = d3.axisBottom(vis.xScale).tickSizeOuter(0);
        vis.yAxis = d3.axisLeft(vis.yScale).ticks(4);

        // Append axis groups.
        vis.xAxisG = vis.context.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.config.contextHeight})`);
        vis.yAxisG = vis.context.append('g')
            .attr('class', 'axis y-axis')
            .attr('transform', 'translate(0,0)');

        // Append y-axis title.
        vis.yAxisG.append("text")
            .attr("class", "axis-title")
            .attr("transform", `translate(-30, ${vis.config.contextHeight / 2}) rotate(-90)`)
            .style("text-anchor", "middle")
            .text("Frequency")
            .style("fill", "black");

        // Define area generator.
        vis.area = d3.area()
            .x(d => vis.xScale(d.date))
            .y1(d => vis.yScale(d.freq))
            .y0(vis.config.contextHeight);

        // Append the area path.
        vis.areaPath = vis.context.append('path')
            .attr('class', 'chart-area');

        // Create brush
        vis.brush = d3.brushX()
        .filter((event) => {
            // If canBrush is false, ignore brush events
            return vis.canBrush && !event.ctrlKey && event.button === 0;
        })
        .extent([[0, 0], [vis.config.contextWidth, vis.config.contextHeight]])
        .on('brush', ({ selection }) => {
            if (selection) {
                let [x0, x1] = selection;
                // If the selection exceeds the maximum width, stop it from growing
                if (x1 - x0 > vis.maxBrushWidth) {
                    x1 = x0 + vis.maxBrushWidth;
                    // Update the brush selection.
                    vis.brushG.call(vis.brush.move, [x0, x1]);
                }
                vis.brushed([x0, x1]);
            }
        })
        .on('end', ({ selection }) => {
            if (!selection) vis.brushed(null);
        });
        
        vis.brushG = vis.context.append('g')
            .attr('class', 'brush x-brush')
            .call(vis.brush);

        // This line will mark the "current date" in the animation
        vis.animationLine = vis.context.append('line')
            .attr('class', 'animation-date-line')
            .attr('y1', 0)
            .attr('y2', vis.config.contextHeight)
            .attr('stroke', 'black')       // pick color
            .attr('stroke-width', 2)
            .style('display', 'none');    // hide by default

        vis.animationDateLabel = vis.context.append('text')
            .attr('class', 'animation-date-label')
            .attr('text-anchor', 'middle')    // center the text horizontally on the line
            .attr('dy', '-5')                 // move it slightly above the line
            .style('font-size', '12px')
            .style('fill', 'black')
            .style('display', 'none');        // hidden until used

        vis.xAxisG.raise();
        vis.yAxisG.raise();

        // Add a label for the left (start) date.
        vis.brushStartLabel = vis.context.append("text")
        .attr("class", "brush-start-label")
        .attr("text-anchor", "start")
        .attr("dy", "-5")  // adjust as needed
        .style("fill", "black")
        .style("display", "none");

        // Add a label for the right (end) date.
        vis.brushEndLabel = vis.context.append("text")
        .attr("class", "brush-end-label")
        .attr("text-anchor", "end")
        .attr("dy", "-5")
        .style("fill", "black")
        .style("display", "none");

        // Add a label for the total frequency.
        vis.brushFreqLabel = vis.context.append("text")
        .attr("class", "brush-freq-label")
        .attr("text-anchor", "middle")
        .attr("dy", "20")  // position below the brush
        .style("fill", "black")
        .style("display", "none");

        vis.updateVis();
    }


    /**
     * Update the area chart scales, area, and axes.
     */
    updateVis() {
        let vis = this;

        // Update domains based on the data.
        vis.xScale.domain(d3.extent(vis.data, d => d.date));
        vis.yScale.domain([0, d3.max(vis.data, d => d.freq)]);

        vis.renderVis();
    }


    renderVis() {
        let vis = this;

        // Update the area path.
        vis.areaPath
            .datum(vis.data)
            .attr('d', vis.area);

        // Update axes.
        vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);

        // // Define the default brush selection.
        // // For instance, to start the brush at Jan 1, 2025:
        const currentYear = localStorage.getItem('year') || '2025'; // Use the year stored in localStorage or default to 2024
        // const defaultBrushSelection = [this.xScale(new Date(`${year}-01-01`)), this.xScale.range()[1]];
        
        // if (!vis.brushSelection) {
        //   vis.brushSelection = defaultBrushSelection;
        // }

        // Retrieve the saved brush selection.
        const storedBrush = localStorage.getItem("brushSelection");
        if (storedBrush) {
            try {
                const brushObj = JSON.parse(storedBrush);
                const startDate = new Date(brushObj.start);
                const endDate = new Date(brushObj.end);

                // Update the year to match the current year.
                startDate.setFullYear(+currentYear);
                endDate.setFullYear(+currentYear);

                // Optionally clamp to the domain of the xScale (if needed).
                const xDomain = vis.xScale.domain();
                if (startDate < xDomain[0]) startDate = xDomain[0];
                if (endDate > xDomain[1]) endDate = xDomain[1];

                vis.brushSelection = [vis.xScale(startDate), vis.xScale(endDate)];
            } catch (e) {
                console.error("Error parsing stored brush selection:", e);
                // Fallback: default brush spanning from Jan 1 to the end of the domain.
                vis.brushSelection = [vis.xScale(new Date(`${currentYear}-01-01`)), vis.xScale.range()[1]];
            }
        } else {
            // If no stored selection, use a default range.
            vis.brushSelection = [vis.xScale(new Date(`${currentYear}-01-01`)), vis.xScale.range()[1]];
        }

        // Apply the brush and move it to the default selection.
        this.brushG
            .call(this.brush)
            .call(this.brush.move, vis.brushSelection);
    }


    /**
     * Brush event handler. Calls the onBrushCallback with filtered data.
     * @param {Array|null} selection - The brush selection in pixels.
     */
    brushed(selection) {
        let vis = this;
        
        if (selection) {
            vis.brushSelection = selection;
            const startDate = vis.xScale.invert(selection[0]);
            const endDate = vis.xScale.invert(selection[1]);
            const filteredData = vis.data.filter(d => d.date >= startDate && d.date <= endDate);
            vis.onBrushCallback(filteredData);
    
            // Save the selection to localStorage as ISO strings.
            localStorage.setItem("brushSelection", JSON.stringify({
                start: startDate.toISOString(),
                end: endDate.toISOString()
            }));
    
            // Update left label (start date).
            vis.brushStartLabel
                .style("display", "block")
                .attr("transform", `translate(${selection[0]+ 3}, ${40})`)
                .text(d3.timeFormat("%m/%d/%Y")(startDate));
    
            // Update right label (end date).
            vis.brushEndLabel
                .style("display", "block")
                .attr("transform", `translate(${selection[1]+ 55}, ${80})`)
                .text(d3.timeFormat("%m/%d/%Y")(endDate));
    
            // Calculate total frequency in the selected range.
            let totalFreq = filteredData.length;
            // Update center label (frequency) at the middle of the brush.
            vis.brushFreqLabel
                .style("display", "block")
                .attr("x", (selection[0] + selection[1]) / 2)
                .attr("y", -25) // Position it below the brush
                .text("Total: " + totalFreq);
        } else {
            localStorage.removeItem("brushSelection");
            vis.onBrushCallback(vis.data);
            vis.brushStartLabel.style("display", "none");
            vis.brushEndLabel.style("display", "none");
            vis.brushFreqLabel.style("display", "none");
        }
    }

    toggleBrushPointerEvents() {
        let vis = this;
        const overlay = document.querySelector('.overlay');
        if (vis.canBrush) {
            // Turn on pointer events
            d3.select(vis.brushG.node())
                .style("pointer-events", "all");
                overlay.style.cursor = 'crosshair'; // Change cursor to indicate brushing is enabled
                vis.animationLine.style('display', 'none');
                vis.animationDateLabel.style('display', 'none');
        } else {
            // Turn them off
            d3.select(vis.brushG.node())
                .style("pointer-events", "none");
                overlay.style.cursor = 'not-allowed'; // Change cursor to indicate brushing is disabled
        }
    }

    // Move the animation line to the given date (or hide if date == null).
    setAnimationDateLine(date) {
        let vis = this;
    
        if (!date) { // Hide the line if no date
            vis.animationLine.style('display', 'none');
            return;
        }
    
        // Convert date to an x-position
        const xPos = vis.xScale(date);
    
        // Show the line and set its x-coordinates
        vis.animationLine
            .style('display', 'block')
            .attr('x1', xPos)
            .attr('x2', xPos);

        // Show the text label
        vis.animationDateLabel
            .style('display', 'block')
            // Position it at the same X
            .attr('x', xPos)
            // Because we used .attr('dy', '-5') earlier, it sits above the line
            // We can also set y explicitly if we prefer, e.g. `.attr('y', -5)`.
            // But we'll rely on the initial .attr('dy','-5') and anchor it near the top.

            // For the text, you can format the date any way you like:
            .text(d3.timeFormat("%m/%d/%Y")(date));
    }

    hideBrushLabels() {
        this.brushStartLabel.style("display", "none");
        this.brushEndLabel.style("display", "none");
        this.brushFreqLabel.style("display", "none");
    }

    showBrushLabels() {
        // Only show if there is an active brush selection.
        if (this.brushSelection) {
            this.brushStartLabel.style("display", "block");
            this.brushEndLabel.style("display", "block");
            this.brushFreqLabel.style("display", "block");
        }
    } 
}
