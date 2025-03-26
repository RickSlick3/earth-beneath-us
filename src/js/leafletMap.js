class LeafletMap {

    /**
     * Class constructor with basic configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            mapHeight: _config.mapHeight || 500, // Height of the map
            contextHeight: 100, // Height of the context
            contextWidth: 800, // Width of the context
            margin: { top: 10, right: 40, bottom: 20, left: 40 },
        }
        this.data = _data;
        this.initVis();
    }

    /**
    * We initialize scales/axes and append static elements, such as axis titles.
    */
    initVis() {
        let vis = this;

        //ESRI
        vis.esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        vis.esriAttr = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

        //TOPO
        vis.topoUrl ='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        vis.topoAttr = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

        //Thunderforest Outdoors- requires key... so meh... 
        vis.thOutUrl = 'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}';
        vis.thOutAttr = '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

        //Stamen Terrain
        vis.stUrl = 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}';
        vis.stAttr = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

        //this is the base map layer, where we are showing the map background
        //**** TO DO - try different backgrounds 
        vis.base_layer = L.tileLayer(vis.esriUrl, {
            id: 'esri-image',
            attribution: vis.esriAttr,
            ext: 'png',
            // noWrap: true  // This disables the tile wrapping, using maxBounds below looks better
        });

        vis.theMap = L.map('my-map', {
            center: [30, 0],
            zoom: 2,
            minZoom: 1,
            maxZoom: 7,
            layers: [vis.base_layer],
            maxBounds: [[-90, -180], [90, 180]],  // Restrict panning to world bounds
        });

        // In your initVis() after setting up vis.data
        // Create a color scale using d3.scaleSequential (or d3.scaleLinear/d3.scaleQuantize as needed)
        // Here we use the d3.extent() function to get the min and max values of the magnitude in your data.
        vis.colorScale = d3.scaleSequential()
            .domain(d3.extent(vis.data, d => d.mag))
            .interpolator(d3.interpolateReds);

        //if you stopped here, you would just have a map

        /**
        * Set up the brushing (context) to filter the points on the map
        */

        // Calculate the overall container width and height, including margins.
        const containerWidth = vis.config.contextWidth + vis.config.margin.left + vis.config.margin.right;
        const containerHeight = vis.config.contextHeight + vis.config.margin.top + vis.config.margin.bottom;

        // Brushing
        // Define the x-scale for the context chart (also a time scale).
        vis.xScaleContext = d3.scaleTime()
            .range([0, vis.config.contextWidth]);

        // Brushing
        // Define the y-scale for the context chart.
        vis.yScaleContext = d3.scaleLinear()
            .range([vis.config.contextHeight, 0])
            .nice();

        // Brushing
        // Initialize the bottom x-axis for the context chart.
        vis.xAxisContext = d3.axisBottom(vis.xScaleContext)
            .tickSizeOuter(0);

        // Brushing
        // Create the main SVG container and set its dimensions.
        vis.svg = d3.select('#context')
            .attr('width', containerWidth)
            .attr('height', containerHeight);

        // Brushing
        // Append a group for the context chart (the brush area) and position it according to context margins.
        vis.context = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Brushing
        // Append a path element for the area chart in the context view.
        vis.contextAreaPath = vis.context.append('path')
            .attr('class', 'chart-area');

        // Brushing
        // Append a group for the context chart's x-axis and position it at the bottom of the context area.
        vis.xAxisContextG = vis.context.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.config.contextHeight})`);

        // Brushing
        // Create a y-axis generator for frequency
        vis.yAxisContext = d3.axisLeft(vis.yScaleContext)
            .ticks(4); // adjust number of ticks as needed

        // Append a group for the y-axis on the left side.
        vis.yAxisContextG = vis.context.append('g')
            .attr('class', 'axis y-axis')
            .attr('transform', 'translate(0,0)');  // left edge of the context group

        vis.yAxisContextG.append("text")
            .attr("class", "axis-title")
            .attr("transform", `translate(-30, ${vis.config.contextHeight / 2}) rotate(-90)`)
            .style("text-anchor", "middle")
            .text("Frequency")
            .style("fill", "black");

        // Brushing
        // Append a group to contain the brush component.
        vis.brushG = vis.context.append('g')
            .attr('class', 'brush x-brush');

        // Brushing
        // Initialize the brush component for the context chart.
        // The brush allows users to select a time range that controls the focus view.
        vis.brush = d3.brushX()
            .extent([[0, 0], [vis.config.contextWidth, vis.config.contextHeight]]) // Define the area that can be brushed.
            .on('brush', function({ selection }) {
                // During brushing, if a selection exists, update the focus view accordingly.
                if (selection) vis.brushed(selection);
            })
            .on('end', function({ selection }) {
                // When the brush action ends, if no selection remains, reset the focus view.
                if (!selection) vis.brushed(null);
            });

        //initialize svg for d3 to add to map
        L.svg({clickable:true}).addTo(vis.theMap)// we have to make the svg layer clickable
        vis.overlay = d3.select(vis.theMap.getPanes().overlayPane)
        vis.svg = vis.overlay.select('svg').attr("pointer-events", "auto")   
        
        // variable to set the radius of the dots
        let rad = vis.theMap.getZoom() * 2;

        // these are the earthquake locations, displayed as a set of dots 
        vis.Dots = vis.svg.selectAll('circle')
            .data(vis.data) 
            .join('circle')
                .attr("fill", d => vis.colorScale(d.mag)) // color dot by magnitude
                .attr("stroke", "black")
                // Leaflet has to take control of projecting points. 
                // Here we are feeding the latitude and longitude coordinates to
                // leaflet so that it can project them on the coordinates of the view. 
                // the returned conversion produces an x and y point. 
                // We have to select the the desired one using .x or .y
                .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).x)
                .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).y) 
                .attr("r", rad)  // radius proportional to zoom level
                
                .on('mouseover', function(event,d) { //function to add mouseover event
                    d3.select(this).raise(); // Bring this dot to the front, hurts performance but looks better

                    d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                        .duration('150') //how long we are transitioning between the two states (works like keyframes)
                        .attr("fill", "steelblue") //change the fill
                        .attr('r', rad * 1.5); //change radius

                    //create a tool tip
                    d3.select('#tooltip')
                        .style('opacity', 1)
                        .style('z-index', 1000000)
                        .html(`<div class="tooltip-label"><strong>Location:</strong> ${d.place}, </br><strong>Magnitude:</strong> ${d3.format(',')(d.mag)}, </br><strong>Depth:</strong> ${d.depth} km, </br><strong>Date:</strong> ${d.time.substring(0, 10)}, </br><strong>Time:</strong> ${d.time.substring(11, 19)} (UTC)</div>`); // Format number with comma separators
                })
                .on('mousemove', (event) => {
                    //position the tooltip
                    let x = event.pageX; // offset tooltip to right
                    if (event.pageX < window.innerWidth / 2) { // if mouse is on left side of screen
                        x = event.pageX + 10; // offset tooltip to right
                    } else { // if mouse is on right side of screen
                        const tooltipWidth = d3.select("#tooltip").node().offsetWidth;
                        x = event.pageX - tooltipWidth - 10; // offset tooltip to left
                    }
                    d3.select('#tooltip')
                        .style('left', (x) + 'px')   
                        .style('top', (event.pageY + 10) + 'px');
                })              
                .on('mouseleave', function() { //function to add mouseover event
                    d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                        .duration('150') //how long we are transitioning between the two states (works like keyframes)
                        .attr("fill", d => vis.colorScale(d.mag)) //change the fill  TO DO- change fill again
                        .attr("r", rad) // change radius back

                    d3.select('#tooltip').style('opacity', 0); // turn off the tooltip
                })
        
        // handler here for updating the map, as you zoom in and out           
        vis.theMap.on("zoomend", function(){
            rad = vis.theMap.getZoom() * 2;
            vis.updateVis();
        });

        // handler here for updating the map, as you swipe around
        // vis.theMap.on("moveend", function(){
        //     vis.updateVis();
        // });



        vis.updateVis(); // call updateVis to set the initial view and draw the dots
    }


    updateVis() {
        let vis = this;

        // Brushing
        // Define accessor functions to extract the date (x-value) and close (y-value) from data objects.
        vis.xValue = d => d.date;
        vis.yValue = d => d.freq;

        // Brushing
        // Set the domains for the context scale based on the minimum and maximum values in the data.
        vis.xScaleContext.domain(d3.extent(vis.data, vis.xValue));
        // For the y-scale, start at 0 and go up to the maximum frequency
        vis.yScaleContext.domain([0, d3.max(vis.data, vis.yValue)]);

        // Brushing
        // Create a D3 area generator for the context chart.
        // It draws an area under the curve, with the bottom fixed at the height of the context chart.
        vis.area = d3.area()
            .x(d => vis.xScaleContext(vis.xValue(d)))  // Map the date to the x coordinate in context.
            .y1(d => vis.yScaleContext(vis.yValue(d)))   // Map the frequency to the top boundary of the area.
            .y0(vis.config.contextHeight);              // Set the baseline (bottom) of the area.

        // want to see how zoomed in you are? 
        console.log("Current Zoom Level: ", vis.theMap.getZoom()); //how zoomed am I?
        
        // // use the zoom level as a basis for changing the size of the points
        // let rad = vis.theMap.getZoom() * 2;

        // // redraw dots based on new zoom - need to recalculate on-screen position
        // vis.Dots
        //     .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).x)
        //     .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).y)
        //     .attr("fill", d => vis.colorScale(d.mag)) // color dot by magnitude
        //     .attr("r", rad); // radius proportional to zoom level

        vis.renderVis();
    }


    renderVis() {
        let vis = this;

        // Brushing
        // Bind the data to the context area path and generate the SVG path using the area generator.
        // BUILDS THE AREA OF THE CONTEXT
        vis.contextAreaPath
            .datum(vis.data)
            .attr('d', vis.area);

        // Brushing
        // Render the x-axis for the context chart.
        vis.xAxisContextG.call(vis.xAxisContext);

        vis.yAxisContextG.call(vis.yAxisContext);

        // Brushing
        // Define a default brush selection.
        // Here the brush starts from January 1, 2025, and extends to the end of the context range.
        const defaultBrushSelection = [vis.xScaleContext(new Date('2025-03-01')), vis.xScaleContext.range()[1]];
        // Apply the brush to the brush group and move it to the default selection.
        vis.brushG
            .call(vis.brush)
            .call(vis.brush.move, defaultBrushSelection);
    }


    brushed(selection) { // need to make this make a new subset of the data and then call updateData
        let vis = this;

        if (selection) {
            // Convert pixel positions from the brush selection into date values.
            const startDate = vis.xScaleContext.invert(selection[0]);
            const endDate = vis.xScaleContext.invert(selection[1]);
    
            // Filter the full dataset (stored in vis.allData) using the d.date property.
            const filteredData = vis.data.filter(d => d.date >= startDate && d.date <= endDate);
            
            // Update the map with the filtered data.
            vis.updateData(filteredData);
        } else {
            // If no selection exists (e.g., brush cleared), reset to the full dataset.
            vis.updateData(vis.data);
        }
    }


    // Use to update dots with new data
    updateData(newData) {
        let vis = this;

        // Update the data reference
        // vis.data = newData;
        
        // Rebind the new data to the dots selection.
        // Use a key function if you have a unique identifier.
        vis.Dots = vis.svg.selectAll('circle')
            .data(newData, d => d.id)
            .join(
                enter => enter.append('circle') // create a new dot
                                .attr("fill", d => vis.colorScale(d.mag))
                                .attr("stroke", "black")
                                .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x)
                                .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y)
                                .attr("r", vis.theMap.getZoom() * 2)
                                
                                // add mouseover and mouseleave events to the new dot
                                .on('mouseover', function(event,d) { //function to add mouseover event
                                    d3.select(this).raise(); // Bring this dot to the front, hurts performance but looks better
                
                                    d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                                        .duration('150') //how long we are transitioning between the two states (works like keyframes)
                                        .attr("fill", "steelblue") //change the fill
                                        .attr('r', rad * 1.5); //change radius
                
                                    //create a tool tip
                                    d3.select('#tooltip')
                                        .style('opacity', 1)
                                        .style('z-index', 1000000)
                                        .html(`<div class="tooltip-label"><strong>Location:</strong> ${d.place}, </br><strong>Magnitude:</strong> ${d3.format(',')(d.mag)}, </br><strong>Depth:</strong> ${d.depth} km, </br><strong>Date:</strong> ${d.time.substring(0, 10)}, </br><strong>Time:</strong> ${d.time.substring(11, 19)} (UTC)</div>`); // Format number with comma separators
                                })
                                .on('mousemove', (event) => {
                                    //position the tooltip
                                    let x = event.pageX; // offset tooltip to right
                                    if (event.pageX < window.innerWidth / 2) { // if mouse is on left side of screen
                                        x = event.pageX + 10; // offset tooltip to right
                                    } else { // if mouse is on right side of screen
                                        const tooltipWidth = d3.select("#tooltip").node().offsetWidth;
                                        x = event.pageX - tooltipWidth - 10; // offset tooltip to left
                                    }
                                    d3.select('#tooltip')
                                        .style('left', (x) + 'px')   
                                        .style('top', (event.pageY + 10) + 'px');
                                })              
                                .on('mouseleave', function() { //function to add mouseover event
                                    d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                                        .duration('150') //how long we are transitioning between the two states (works like keyframes)
                                        .attr("fill", d => vis.colorScale(d.mag)) //change the fill  TO DO- change fill again
                                        .attr("r", rad) // change radius back
                
                                    d3.select('#tooltip').style('opacity', 0); // turn off the tooltip
                                }),
                update => update, // keep dot
                exit => exit.remove() // remove dot
            );
    
        // Put new dots in the correct place
        // vis.updateVis(); // calling update vis creates endless loop, moved dot logic here

        // use the zoom level as a basis for changing the size of the points
        let rad = vis.theMap.getZoom() * 2;

        // redraw dots based on new zoom - need to recalculate on-screen position
        vis.Dots
            .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).x)
            .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).y)
            .attr("fill", d => vis.colorScale(d.mag)) // color dot by magnitude
            .attr("r", rad); // radius proportional to zoom level
    }
}