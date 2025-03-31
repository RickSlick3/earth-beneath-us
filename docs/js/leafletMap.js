class LeafletMap {

    /**
     * Class constructor with basic configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, onFilterCallback, onAnimationDisableInteraction, onAnimationEnableInteraction, onDayCallback, onDayHeatmapUpdate) {        
        this.config = {
            parentElement: _config.parentElement,
            mapHeight: _config.mapHeight || 500, // Height of the map
        }
        this.data = _data;
        this.filteredData = _data; // keep track of filtered data
        this.currentSelection = 'mag'; // default button selection
        this.radius = 0;
        this.selectionMode = false;
        this.filterRectangle = null;
        this.onFilterCallback = onFilterCallback;
        this.onAnimationDisableInteraction = onAnimationDisableInteraction;
        this.onAnimationEnableInteraction = onAnimationEnableInteraction;
        this.onDayCallback = onDayCallback;        
        this.onDayHeatmapUpdate = onDayHeatmapUpdate;
        this.isAnimating = false; // true while animation is playing
        this.initVis();
    }


    /**
    * We initialize scales/axes and append static elements, such as axis titles.
    */
    initVis() {
        let vis = this;
        
        // // ESRI
        // const esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        // const esriAttr = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
        // // TOPO
        // const topoUrl ='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        // const topoAttr = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
        // // Street map
        // const streetUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
        // const streetAttr = 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012';
        // // Dark/contrast
        // const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        // const darkAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

        const tileLayers = {
            terrain: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            },
            topograph: {
                url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
            },
            street: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
            },
            contrast: {
                url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            },
        };

        // Read preferred map type or default to 'esri'
        const mapType = localStorage.getItem('mapType') || 'terrain';

        // Assign URL and attribution from the dictionary
        const { url, attribution } = tileLayers[mapType] || tileLayers.terrain;

        vis.mapUrl = url;
        vis.mapAttr = attribution;

        //this is the base map layer, where we are showing the map background
        //**** TO DO - try different backgrounds 
        vis.base_layer = L.tileLayer(vis.mapUrl, {
            id: 'esri-image',
            attribution: vis.mapAttr,
            ext: 'png',
            noWrap: true,  // This disables the tile wrapping, using maxBounds below looks better
            bounds: [[-90, -180], [90, 180]]  // Only load tiles within these bounds.
        });

        vis.theMap = L.map('my-map', {
            center: [30, 0],
            zoom: 2,
            minZoom: 1,
            maxZoom: 9,
            layers: [vis.base_layer],
            maxBounds: [[-90, -360], [90, 360]],  // Restrict panning to world bounds
        });

        let startPoint = null; // Store start point of the selection
        vis.selectedBounds = vis.theMap.getBounds();

        // Mouse Down - Start Selection
        vis.theMap.on("mousedown", function (e) {
            if (!vis.selectionMode) return;
            startPoint = e.latlng; // Store the starting LatLng
        });

        // Mouse Move - Update Rectangle
        vis.theMap.on("mousemove", function (e) {
            if (!vis.selectionMode || !startPoint) return;

            // Get current mouse position in LatLng
            let currentPoint = e.latlng;
            
            // Define bounds for the rectangle
            let bounds = L.latLngBounds(startPoint, currentPoint);

            // If rectangle already exists, update it
            if (vis.filterRectangle) {
                vis.filterRectangle.setBounds(bounds);
            } else {
                // Otherwise, create a new rectangle
                vis.filterRectangle = L.rectangle(bounds, { color: "gray", weight: 1, pane: "shadowPane" }).addTo(vis.theMap);
            }
        });

        // Mouse Up - Finalize Selection
        vis.theMap.on("mouseup", function () {
            if (!vis.selectionMode || !vis.filterRectangle) return;

            vis.selectedBounds = vis.filterRectangle.getBounds(); // Get selected area
            console.log("Selected Area:", vis.selectedBounds);

            // Zoom to the selected area
            vis.theMap.fitBounds(vis.selectedBounds);
            vis.setAreaFilteredDataAndUpdate();

            // Reset selection
            startPoint = null;
            vis.toggleSelectionArea();
        });

        // Create a color scale using d3.scaleSequential (or d3.scaleLinear/d3.scaleQuantize as needed)
        // Here we use the d3.extent() function to get the min and max values of the magnitude in your data.
        vis.colorScale = d3.scaleSequential()
            .domain(d3.extent(vis.data, d => d[vis.currentSelection])) // set the domain to the extent of the attribute
            // .domain([0, d3.max(vis.data, d => d[vis.currentSelection])]) // set the domain to the min and max of the attribute
            .interpolator(d3.interpolateReds);

        //if you stopped here, you would just have a map

        //initialize svg for d3 to add to map
        L.svg({clickable:true}).addTo(vis.theMap)// we have to make the svg layer clickable
        vis.overlay = d3.select(vis.theMap.getPanes().overlayPane)
        vis.svg = vis.overlay.select('svg').attr("pointer-events", "auto")   
        
        // variable to set the radius of the dots
        vis.radius = vis.theMap.getZoom() * 2;

        // these are the earthquake locations, displayed as a set of dots 
        vis.Dots = vis.svg.selectAll('circle')
            .data(vis.data) 
            .join('circle')
                .attr("fill", d => vis.colorScale(d[vis.currentSelection])) // color dot by magnitude
                .attr("stroke", "black")
                // Leaflet has to take control of projecting points. 
                // Here we are feeding the latitude and longitude coordinates to
                // leaflet so that it can project them on the coordinates of the view. 
                // the returned conversion produces an x and y point. 
                // We have to select the the desired one using .x or .y
                .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).x)
                .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).y) 
                .attr("r", vis.radius)  // radius proportional to zoom level
                
                .on('mouseover', function(event,d) { //function to add mouseover event
                    d3.select(this).raise(); // Bring this dot to the front, hurts performance but looks better

                    d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                        .duration('150') //how long we are transitioning between the two states (works like keyframes)
                        .attr("fill", "steelblue") //change the fill
                        .attr('r', vis.radius * 1.5); //change radius

                    //create a tool tip
                    d3.select('#tooltip')
                        .style('display', 'block')
                        .style('z-index', 1000000)
                        .html(`<div class="tooltip-label"><strong>Location:</strong> ${d.place}, 
                            </br><strong>Magnitude:</strong> ${d3.format(',')(d.mag)}, 
                            </br><strong>Depth:</strong> ${d.depth} km, 
                            </br><strong>Date:</strong> ${d.time.substring(0, 10)}, 
                            </br><strong>Time:</strong> ${d.time.substring(11, 19)} (UTC)</div>`); // Format number with comma separators
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
                    // let rad = vis.theMap.getZoom() * 2;
                    d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                        .duration('150') //how long we are transitioning between the two states (works like keyframes)
                        .attr("fill", d => vis.colorScale(d[vis.currentSelection])) // change the fill color
                        .attr("r", vis.radius) // change radius back

                    d3.select('#tooltip').style('display', 'none'); // turn off the tooltip
                })
        
        // handler here for updating the map, as you zoom in and out           
        vis.theMap.on("zoomend", function(){
            vis.radius = vis.theMap.getZoom() * 2; // update the radius based on zoom level
            vis.updateData();
        });

        vis.groupItems = false;

        // handler here for updating the map, as you swipe around
        // vis.theMap.on("moveend", function(){
        //     vis.updateVis();
        // });

        vis.createLegend();
        vis.createButtons();
        vis.groupEarthquakes(1000);

        vis.updateVis(); // call updateVis to set the initial view and draw the dots
    }


    updateVis() {
        let vis = this;

        // want to see how zoomed in you are? 
        console.log("Current Zoom Level: ", vis.theMap.getZoom()); //how zoomed am I?

        vis.renderVis();
    }


    renderVis() {
        let vis = this;

    }

    setAreaFilteredDataAndUpdate() {
      let vis = this;
      vis.areaFilteredData = vis.data.filter(x => {
        let latlng = {lat: x.latitude, lng: x.longitude};
        return vis.selectedBounds.contains(latlng);
      });
      vis.onFilterCallback(vis.areaFilteredData);
    }

    setTimeFilteredDataAndUpdate(newData) {
      let vis = this;
      vis.filteredData = newData;
      vis.groupEarthquakes(1000);
      vis.updateData();
    }


    // Use to update dots with new data
    updateData() {
        let vis = this;

        // variable to set the radius of the dots
        vis.radius = vis.theMap.getZoom() * 2;
        
        // Rebind the new data to the dots selection.
        // Use a key function if you have a unique identifier.
        if (vis.groupItems) {
          vis.Dots = vis.svg.selectAll('circle')
            .data(vis.groupedData, d => d.id)
            .join(
                enter => enter.append('circle') // create a new dot
                    .attr("fill", d => vis.colorScale(d[vis.currentSelection]))
                    .attr("stroke", "black")
                    .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x)
                    .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y)
                    .attr("r", vis.radius)
                    .style("opacity", vis.isAnimating ? 0 : 1) // 0 for animation, 1 for all other updateData calls
                    
                    // add mouseover and mouseleave events to the new dot
                    .on('mouseover', function(event,d) { //function to add mouseover event
                        d3.select(this).raise(); // Bring this dot to the front, hurts performance but looks better
    
                        d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                            .duration('150') //how long we are transitioning between the two states (works like keyframes)
                            .attr("fill", "steelblue") //change the fill
                            .attr('r', vis.radius * 1.5); //change radius
    
                        //create a tool tip
                        d3.select('#tooltip')
                            .style('display', 'block')
                            .style('z-index', 1000000)
                            .html(`<div class="tooltip-label"><strong>Location:</strong> Near ${d.location}, 
                                </br><strong>Average Magnitude:</strong> ${d3.format(',')(d.mag.toFixed(2))}, 
                                </br><strong>Average Depth:</strong> ${d.depth.toFixed(2)} km, 
                                </br><strong>Num. Items:</strong> ${d.numPoints}</div>`);
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
                            .attr("fill", d => vis.colorScale(d[vis.currentSelection])) //change the fill  TO DO- change fill again
                            .attr("r", vis.radius) // change radius back
    
                            d3.select('#tooltip').style('display', 'none'); // turn off the tooltip
                    }),
                update => update.style("opacity", vis.isAnimating ? 0 : 1), // keep dot but update opacity
                exit => exit.remove() // remove dot
            );
        }
        else {
        vis.Dots = vis.svg.selectAll('circle')
            .data(vis.filteredData, d => d.id)
            .join(
                enter => enter.append('circle') // create a new dot
                    .attr("fill", d => vis.colorScale(d[vis.currentSelection]))
                    .attr("stroke", "black")
                    .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x)
                    .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y)
                    .attr("r", vis.radius)
                    .style("opacity", vis.isAnimating ? 0 : 1) // 0 for animation, 1 for all other updateData calls
                    
                    // add mouseover and mouseleave events to the new dot
                    .on('mouseover', function(event,d) { //function to add mouseover event
                        d3.select(this).raise(); // Bring this dot to the front, hurts performance but looks better
    
                        d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                            .duration('150') //how long we are transitioning between the two states (works like keyframes)
                            .attr("fill", "steelblue") //change the fill
                            .attr('r', vis.radius * 1.5); //change radius
    
                        //create a tool tip
                        d3.select('#tooltip')
                            .style('display', 'block')
                            .style('z-index', 1000000)
                            .html(`<div class="tooltip-label"><strong>Location:</strong> ${d.place}, 
                                </br><strong>Magnitude:</strong> ${d3.format(',')(d.mag)}, 
                                </br><strong>Depth:</strong> ${d.depth} km, 
                                </br><strong>Date:</strong> ${d.time.substring(0, 10)}, 
                                </br><strong>Time:</strong> ${d.time.substring(11, 19)} (UTC),
                                </br><strong>Local Time:</strong> ${d.localTime} (${d.timezoneAbbrev})</div>`);
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
                            .attr("fill", d => vis.colorScale(d[vis.currentSelection])) //change the fill  TO DO- change fill again
                            .attr("r", vis.radius) // change radius back
    
                            d3.select('#tooltip').style('display', 'none'); // turn off the tooltip
                    }),
                update => update.style("opacity", vis.isAnimating ? 0 : 1), // keep dot but update opacity
                exit => exit.remove() // remove dot
            );
          }

        // redraw dots based on new zoom - need to recalculate on-screen position
        vis.Dots
            .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).x)
            .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).y)
            .attr("fill", d => vis.colorScale(d[vis.currentSelection])) // color dot by magnitude
            .attr("r", vis.radius); // radius proportional to zoom level
    }


    /**
    * Here we will create the legend for the map
    */
    createLegend() {
        let vis = this;

        // Create an SVG for the legend and append it to the body (or a container)
        let legendSvg = d3.select("div.leaflet-top.leaflet-right").append("svg")
            .attr("id", "legend-svg")
            .attr("width", 30)
            .attr("height", 205)
            .style("position", "absolute")
            .style("left", "-50px")
            .style("top", "10px")
            .style("padding", "5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style("background-color", "white");

        // Append a defs element for the gradient.
        let defs = legendSvg.append("defs");
        let linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        // Use your color scale to define the stops.
        let tickCount = 5;
        let ticks = vis.colorScale.ticks(tickCount);
        ticks.forEach((d, i) => {
            linearGradient.append("stop")
                .attr("offset", `${(100 * i) / (ticks.length - 1)}%`)
                .attr("stop-color", vis.colorScale(d));
        });

        // Append a rectangle that uses the gradient.
        legendSvg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 30)
            .attr("height", 200)
            .style("fill", "url(#legend-gradient)");

        // Create a scale for the legend axis.
        let legendScale = d3.scaleLinear()
            .domain(vis.colorScale.domain())
            .range([200, 0]);

        let legendAxis = d3.axisRight(legendScale)
            .ticks(5);

        // Append a group for the legend axis.
        legendSvg.append("g")
            .attr("class", "legend-axis")
            .attr("transform", "translate(0,0)")
            .call(legendAxis);

        d3.select("#legend-svg").raise();
    }


    /**
    * Here we will create the buttons for the map
    */
    createButtons() {
        let vis = this;

        // Create a container for the buttons and append it to a Leaflet control container
        let buttonContainer = d3.select("div.leaflet-top.leaflet-right")
            .append("div")
            .attr("id", "button-container")
            .style("position", "absolute")
            .style("left", "-190px")      // Adjust horizontal position as needed
            .style("top", "10px")        // Adjust vertical position as needed
            .style("width", "120px")
            .style("background-color", "white")
            .style("padding", "5px 5px 0 5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style("box-shadow", "0 0 5px rgba(0,0,0,0.3)");

        // Define an array of button objects, each with a label and a color for the small square.
        let buttons = [
            { label: "Magnitude", color: "#ff0000", interpolator: "interpolateReds" },  // green
            { label: "Depth (km)", color: "#0000ff", interpolator: "interpolateBlues" }   // orange
        ];

        // Create one row per button.
        buttons.forEach(btn => {
            let row = buttonContainer.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .style("margin-bottom", "5px");
            
            // Append a small square (as a div) with the given background color.
            row.append("div")
                .style("width", "15px")
                .style("height", "15px")
                .style("background-color", btn.color)
                .style("margin-right", "5px");
            
            // Append a button element with the corresponding label.
            row.append("button")
                .text(btn.label)
                .style("flex-grow", "1")
                .style("cursor", "pointer")
                .style('pointer-events', 'all') // allow pointer events
                .on("click", function() {
                    // Determine the new selection based on the button label.
                    let newSelection;
                    if (btn.label.toLowerCase().includes("mag")) {
                        newSelection = "mag";
                    } else if (btn.label.toLowerCase().includes("depth")) {
                        newSelection = "depth";
                    } else {
                        newSelection = btn.label; // fallback option
                    }
                    
                    // Update the current selection.
                    vis.currentSelection = newSelection;
                    console.log("Current Selection: ", vis.currentSelection);
                    
                    // Update the color scale based on the new selection.
                    vis.colorScale
                        .domain(d3.extent(vis.data, d => d[vis.currentSelection]))
                        .interpolator(d3[btn.interpolator]); // use the interpolator from the button object
                    
                    // Redraw dots with the updated color scale.
                    vis.Dots.attr("fill", d => vis.colorScale(d[vis.currentSelection]));
                    
                    // Update the legend
                    let legendScale = d3.scaleLinear()
                        .domain(vis.colorScale.domain())
                        .range([200, 0]);

                    let legendAxis = d3.axisRight(legendScale)
                        .ticks(5);

                    // Update the legend axis group (assuming it has class "legend-axis")
                    d3.select("svg#legend-svg g.legend-axis")
                        .call(legendAxis);

                    // Update the gradient stops in the legend
                    let tickCount = 5;
                    let ticks = vis.colorScale.ticks(tickCount);
                    let gradient = d3.select("svg#legend-svg")
                        .select("defs")
                        .select("linearGradient#legend-gradient");

                    // Remove old stops before updating
                    gradient.selectAll("stop").remove();

                    // Append new stops
                    ticks.forEach((d, i) => {
                    gradient.append("stop")
                        .attr("offset", `${(100 * i) / (ticks.length - 1)}%`)
                        .attr("stop-color", vis.colorScale(d));
                    });
                });
        });

        d3.select("#button-container").raise();

        // Toggle Grouping Display Button
        vis.toggleGroupingButton = d3.select("div.leaflet-top.leaflet-left")
            .append("button")
            .attr("id", "toggle-grouping-button")
            .text("Toggle Earthquake Grouping")
            .style("position", "absolute")
            .style("left", "50px")    // Adjust horizontal position as needed
            .style("top", "10px")   // Adjust vertical position so it doesn't overlap other controls
            .style("width", "110px")
            .style("background-color", "white")
            .style("padding", "5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style('pointer-events', 'all') // allow pointer events
            .style("cursor", "pointer")
            .on("click", function(event) {
                vis.groupItems = !vis.groupItems;

                if (vis.groupItems) {
                  vis.groupEarthquakes(1000);
                }
                vis.updateData();
            });
        
        vis.buttonText = "Enter Selection Mode"
        // Map Area Select Button
        vis.areaSelectButton = d3.select("div.leaflet-top.leaflet-left")
            .append("button")
            .attr("id", "area-button")
            .text(vis.buttonText)
            .style("position", "absolute")
            .style("left", "165px")      // Adjust horizontal position as needed
            .style("top", "10px")        // Adjust vertical position as needed
            .style("width", "140px")
            .style("background-color", "white")
            .style("padding", "5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style("flex-grow", "1")
            .style("cursor", "pointer")
            .style('pointer-events', 'all') // allow pointer events
            .on("click", function() {
              vis.toggleSelectionArea();
            })
            // Add tooltip on hover:
            .on("mouseover", function(event) {
                d3.select("#tooltip")
                    .html("Click to enter selection mode. Click and drag to filter by an area on the map.")
                    .style("display", "block")
                    .style("width", "110px");
                const buttonRect = this.getBoundingClientRect();
                const tooltip = d3.select("#tooltip");
                const tooltipWidth = tooltip.node().offsetWidth;
                const leftPos = buttonRect.left + (buttonRect.width / 2) - (tooltipWidth / 2);
                const topPos = buttonRect.bottom + 5;
                tooltip.style("left", leftPos + "px").style("top", topPos + "px");
            })
            .on("mouseout", function() {
                d3.select("#tooltip").style("display", "none");
            });
        L.DomEvent.disableClickPropagation(vis.areaSelectButton.node()); // Disable additional click propagation

        // Toggle Area Chart Display Button
        vis.toggleChartButton = d3.select("div.leaflet-top.leaflet-left")
            .append("button")
            .attr("id", "toggle-area-chart-button")
            .text("Toggle Brushing")
            .style("position", "absolute")
            .style("left", "310px")   // Adjust horizontal position as needed
            .style("top", "10px")    // Adjust vertical position so it doesn't overlap other buttons
            .style("width", "110px")
            .style("background-color", "white")
            .style("padding", "5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style('pointer-events', 'all') // allow pointer events
            .style("cursor", "pointer")
            .on("click", function() {
                let chart = d3.select("#area-chart");
                if (chart.style("display") === "none") {
                    chart.style("display", "block");
                    localStorage.setItem('showAreaChart', 'true');
                } else {
                    chart.style("display", "none");
                    localStorage.setItem('showAreaChart', 'false');
                }
            })
            // Add tooltip on hover:
            .on("mouseover", function(event) {
                d3.select("#tooltip")
                    .html("Click to show/hide the brushing tool. Click and drag to filter by a selected timeframe.")
                    .style("display", "block")
                    .style("width", "110px");
                const buttonRect = this.getBoundingClientRect();
                const tooltip = d3.select("#tooltip");
                const tooltipWidth = tooltip.node().offsetWidth;
                const leftPos = buttonRect.left + (buttonRect.width / 2) - (tooltipWidth / 2);
                const topPos = buttonRect.bottom + 5;
                tooltip.style("left", leftPos + "px").style("top", topPos + "px");
            })
            .on("mouseout", function() {
                d3.select("#tooltip").style("display", "none");
            });
        L.DomEvent.disableClickPropagation(vis.toggleChartButton.node()); // Disable additional click propagation

        // Toggle Heatmap Display Button
        vis.toggleHeatmapButton = d3.select("div.leaflet-top.leaflet-left")
            .append("button")
            .attr("id", "toggle-heatmap-button")
            .text("Toggle Heatmap")
            .style("position", "absolute")
            .style("left", "425px")    // Adjust horizontal position as needed
            .style("top", "10px")   // Adjust vertical position so it doesn't overlap other controls
            .style("width", "110px")
            .style("background-color", "white")
            .style("padding", "5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style('pointer-events', 'all') // allow pointer events
            .style("cursor", "pointer")
            .on("click", function(event) {
                // Prevent the click event from affecting the map
                event.stopPropagation();
                let heatmap = d3.select("#heatmap");
                if (heatmap.style("display") === "none") {
                    heatmap.style("display", "block");
                    localStorage.setItem('showHeatmap', 'true');
                } else {
                    heatmap.style("display", "none");
                    localStorage.setItem('showHeatmap', 'false');
                }
            })
            // Add tooltip on hover:
            .on("mouseover", function(event) {
                d3.select("#tooltip")
                    .html("Click to show/hide the heatmap. Click the bins to filter by magnitude and depth.")
                    .style("display", "block")
                    .style("width", "110px");
                const buttonRect = this.getBoundingClientRect();
                const tooltip = d3.select("#tooltip");
                const tooltipWidth = tooltip.node().offsetWidth;
                const leftPos = buttonRect.left + (buttonRect.width / 2) - (tooltipWidth / 2);
                const topPos = buttonRect.bottom + 5;
                tooltip.style("left", leftPos + "px").style("top", topPos + "px");
            })
            .on("mouseout", function() {
                d3.select("#tooltip").style("display", "none");
            });
        L.DomEvent.disableClickPropagation(vis.toggleHeatmapButton.node()); // Disable additional click propagation

        // ANIMATION BUTTONS
        // Animation speed dropdown
        vis.animationSpeedSelect = d3.select("div.leaflet-top.leaflet-left")
            .append("select")
            .attr("id", "animation-speed")
            .style("position", "absolute")
            .style("left", "540px")
            .style("top", "40px")
            .style("width", "110px")
            .style("display", "none")    // HIDE IT AT FIRST
            .style("background-color", "white")
            .style("padding", "2px")
            .style("border", "1px solid black")
            .style("border-radius", "3px")
            .style('pointer-events', 'all');

        vis.animationSpeedSelect
            .append("option").attr("value", "").attr("disabled", true).attr("selected", true).text("Select Speed"); // Default option
        vis.animationSpeedSelect
            .append("option").attr("value", 1000).text("Slow");
        vis.animationSpeedSelect
            .append("option").attr("value", 500).text("Medium");
        vis.animationSpeedSelect
            .append("option").attr("value", 200).text("Fast");

        // Listen for user selection
        vis.animationSpeedSelect
            .on("change", async function() {
                let speed = parseInt(d3.select(this).property("value"));
                // Hide the dropdown
                d3.select(this).style("display", "none");
                // Run the animation
                await vis.animateDayByDay(speed);
            });

        // A button to animate the filtered data day by day
        vis.animateButton = d3.select("div.leaflet-top.leaflet-left")
            .append("button")
            .attr("id", "animate-button")
            .text("Animate Days")   // initial text
            .style("position", "absolute")
            .style("left", "540px")
            .style("top", "10px")
            .style("width", "110px")
            .style("background-color", "white")
            .style("padding", "5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style("cursor", "pointer")
            .style('pointer-events', 'all')
            .on("click", () => {
                if (!vis.isAnimating) {
                // If NOT currently animating, show the speed dropdown as before:
                d3.select("#animation-speed")
                    .style("display", "block");
                } else {
                // If we ARE currently animating, user wants to STOP:
                vis.isAnimating = false;       // This will signal the loop to break
                // Also interrupt any ongoing D3 transitions, so we don't hang waiting
                vis.svg.selectAll("circle").interrupt();
                }
            });
        L.DomEvent.disableClickPropagation(vis.animateButton.node()); // Disable additional click propagation

        // Year Selector
        vis.yearSelectorContainer = d3.select("div.leaflet-top.leaflet-left")
            .append("div")
            .attr("id", "year-selector-container")
            .style("position", "absolute")
            .style("left", "655px")    // adjust as needed so it doesn't overlap your other buttons
            .style("top", "10px")
            .style("width", "70px")
            .style("background-color", "white")
            .style("padding", "5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style('pointer-events', 'all'); // allows click events
        L.DomEvent.disableClickPropagation(vis.yearSelectorContainer.node());

        vis.yearSelectorContainer.append("label")
            .text("Select Year")
            .style("display", "block")
            .style("margin-bottom", "3px");

        let yearSelect = vis.yearSelectorContainer
            .append("select")
            .style("width", "100%");

        const availableYears = JSON.parse(localStorage.getItem('availableYears'));

        yearSelect.selectAll("option")
            .data(availableYears)
            .enter()
            .append("option")
                .attr("value", d => d)
                .text(d => d);

        const currentYear = localStorage.getItem("year") || "2025";
        yearSelect.property("value", currentYear);

        yearSelect.on("change", function(event) {
            const newYear = d3.select(this).property("value");
            localStorage.setItem("year", newYear); // store in local storage
            window.location.reload(); // reload the page so main.js picks up the new year
        });

        // Map Selector
        vis.mapSelectorContainer = d3.select("div.leaflet-top.leaflet-left")
            .append("div")
            .attr("id", "map-selector-container")
            .style("position", "absolute")
            .style("left", "740px")    // adjust as needed so it doesn't overlap your other buttons
            .style("top", "10px")
            .style("width", "90px")
            .style("background-color", "white")
            .style("padding", "5px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style('pointer-events', 'all'); // allows click events
        L.DomEvent.disableClickPropagation(vis.mapSelectorContainer.node());

        vis.mapSelectorContainer.append("label")
            .text("Select Map")
            .style("display", "block")
            .style("margin-bottom", "3px");

        let mapSelect = vis.mapSelectorContainer
            .append("select")
            .style("width", "100%");

        const availableMaps = JSON.parse(localStorage.getItem('availableMaps'));

        mapSelect.selectAll("option")
            .data(availableMaps)
            .enter()
            .append("option")
                .attr("value", d => d)
                .text(d => d);

        const currentMap = localStorage.getItem("mapType") || "terrain";
        mapSelect.property("value", currentMap);

        mapSelect.on("change", function(event) {
            const newMap = d3.select(this).property("value");
            localStorage.setItem("mapType", newMap); // store in local storage
            window.location.reload(); // reload the page so main.js picks up the new year
        });
    }

    toggleSelectionArea() {
      let vis = this;

      if (vis.buttonText == "Enter Selection Mode") {
        vis.selectionMode = true;
        vis.theMap.dragging.disable();
        vis.theMap.scrollWheelZoom.disable();
        vis.theMap.doubleClickZoom.disable();
        vis.theMap.boxZoom.disable();
        vis.overlay.style('cursor', 'crosshair');
        vis.buttonText = "Exit Selection Mode";
      } else {
        vis.selectionMode = false;
        vis.theMap.dragging.enable();
        vis.theMap.scrollWheelZoom.enable();
        vis.theMap.doubleClickZoom.enable();
        vis.theMap.boxZoom.enable();
        vis.overlay.style('cursor', 'auto');
        if (vis.buttonText == "Exit Selection Mode") {
          if (vis.filterRectangle) {
            vis.buttonText = "Clear Selection";
          }
          else {
            vis.buttonText = "Enter Selection Mode";
          }
        }
        else {
          if (vis.filterRectangle) {
            vis.theMap.removeLayer(vis.filterRectangle);
            vis.filterRectangle = null;
            vis.selectedBounds = vis.theMap.options.maxBounds;
          }
          vis.setAreaFilteredDataAndUpdate();
          vis.buttonText = "Enter Selection Mode";
        }
      }
      d3.select("#area-button").text(vis.buttonText);
    }

    async animateDayByDay(cycleTime = 1000) {
        let vis = this;

        // If there’s no data to animate or already animating, just return.
        if (!vis.filteredData || vis.filteredData.length === 0 || vis.isAnimating) {
            return;
        }

        // Turn on animation mode so new circles start at opacity 0
        vis.isAnimating = true;

        if (vis.onAnimationDisableInteraction) {
            vis.onAnimationDisableInteraction();
        }

        // Update button text to "Stop Animation"
        d3.select("#animate-button").text("Stop Animation");

        // Store the current filtered data so we can restore it later
        const originalData = vis.filteredData;
        console.log("originalData before animation: ", originalData); // Log the original data to see what is being passed in
        
        // Group our data by day (based on your `d.date` field)
        // (Make sure each record has a valid date in the `date` field.)
        // We'll get an array of [dayString, records[]].
        let dataByDay = d3.rollups(
            vis.filteredData,
            records => records,
            d => d3.timeFormat("%Y-%m-%d")(d.date)  // group by day string, e.g. "2025-01-12"
        );

        // Sort days in ascending order, so we animate from earliest to latest
        dataByDay.sort((a, b) => d3.ascending(a[0], b[0]));

        // Optionally remove or clear existing dots on the map right away
        // so the first day “starts fresh.” This is personal preference.
        // Here’s one way: set empty data, then update.
        vis.filteredData = [];
        vis.updateData();

        try {
            // Loop through each day
            for (const [dayString, records] of dataByDay) {
                // If user clicked STOP mid-loop, exit immediately:
                if (!vis.isAnimating) break;

                // Set the map’s filtered data to that day’s records
                vis.filteredData = records;
                vis.updateData();

                if (this.onDayCallback) {
                    let date = d3.timeParse("%Y-%m-%d")(dayString);
                    this.onDayCallback(date);
                }
                if (this.onDayHeatmapUpdate) {
                    this.onDayHeatmapUpdate(records, false);
                }

                await this.fadeIn(cycleTime/2);
                await new Promise(r => setTimeout(r, cycleTime));
                await this.fadeOut(cycleTime/2);
            }
        } finally {
            // Turn off animation mode so normal updates come in fully visible
            vis.isAnimating = false;
            // Animation is finished. Reset to original, full filtered data
            vis.filteredData = originalData;
            vis.updateData();
            console.log("vis.filteredData after animation: ", vis.filteredData); 
            console.log("vis.dots after animation: ", vis.Dots); // Log the dots to see if they are updated
            // reset button and selector
            d3.select("#animate-button").text("Animate Days"); // Reset button text
            d3.select("#animation-speed").property("selectedIndex", 0);

            // callbacks
            if (vis.onAnimationEnableInteraction) {
                vis.onAnimationEnableInteraction();
            }
            if (this.onDayHeatmapUpdate) {
                // revert heatmap to the full dataset or whatever you prefer
                this.onDayHeatmapUpdate(originalData, true);
            }
        }
    }

    // Dot animations
    fadeIn(duration = 500) {
        const circleSel = this.svg.selectAll('circle');
        if (circleSel.empty()) return Promise.resolve();
        return circleSel
            .transition()
            .duration(duration)
            .style('opacity', 1)
            .end();  // returns a Promise
    }
    fadeOut(duration = 500) {
        const circleSel = this.svg.selectAll('circle');
        if (circleSel.empty()) return Promise.resolve();
        return circleSel
            .transition()
            .duration(duration)
            .style('opacity', 0)
            .end();
    }

    gridHash(point, gridSize) {
      return `${Math.floor(point.latitude / gridSize)},${Math.floor(point.longitude / gridSize)}`;
    }

    haversineDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth radius in km
      const toRad = (deg) => (deg * Math.PI) / 180;
  
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      
      const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
          
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
  }

    groupEarthquakes(radius) {
      let vis = this;
      vis.previouslyFilteredData = vis.filteredData
      vis.groupedData = [];

      const gridSize = radius / 111; // Approximate km per degree
      const grid = new Map();
      
      vis.filteredData.forEach(point => {
          const key = vis.gridHash(point, gridSize);
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(point);
      });

      const result = Array.from(grid.values());
      result.forEach(x => {
        let groupPoint = {depth: 0.0, mag: 0.0, latitude: 0.0, longitude: 0.0, location: "", numPoints: 0};
        groupPoint.depth = x.reduce((sum, item) => sum + item.depth, 0) / x.length;
        groupPoint.mag = x.reduce((sum, item) => sum + item.mag, 0) / x.length;
        groupPoint.latitude = x.reduce((sum, item) => sum + item.latitude, 0) / x.length;
        groupPoint.longitude = x.reduce((sum, item) => sum + item.longitude, 0) / x.length;
        groupPoint.location = x[0].place.indexOf("of ") === -1 ? x[0].place : x[0].place.substring(x[0].place.indexOf("of ") + 3);
        groupPoint.numPoints = x.length;
        vis.groupedData.push(groupPoint);
      })
      console.log(vis.groupedData);
    }
}