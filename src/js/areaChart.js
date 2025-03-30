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
            margin: _config.margin || { top: 10, right: 40, bottom: 20, left: 40 }
        };
        this.data = _data;
        this.onBrushCallback = onBrushCallback; // Called when brush selection changes.
        this.maxBrushWidth = 200; // Maximum width of the brush selection in pixels
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

        vis.xAxisG.raise();
        vis.yAxisG.raise();

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

        // Define the default brush selection.
        // For instance, to start the brush at Jan 1, 2025:
        const defaultBrushSelection = [this.xScale(new Date('2025-03-01')), this.xScale.range()[1]];
        
        if (!vis.brushSelection) {
          vis.brushSelection = defaultBrushSelection;
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
        } else {
            vis.onBrushCallback(vis.data);
        }
    }
}
