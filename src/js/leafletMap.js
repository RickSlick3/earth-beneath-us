class LeafletMap {

    /**
     * Class constructor with basic configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, onFilterCallback) {
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
            noWrap: true  // This disables the tile wrapping, using maxBounds below looks better
        });

        vis.theMap = L.map('my-map', {
            center: [30, 0],
            zoom: 2,
            minZoom: 1,
            maxZoom: 7,
            layers: [vis.base_layer],
            maxBounds: [[-90, -180], [90, 180]],  // Restrict panning to world bounds
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

        // handler here for updating the map, as you swipe around
        // vis.theMap.on("moveend", function(){
        //     vis.updateVis();
        // });

        vis.createLegend();
        vis.createButtons();

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
      console.log(vis.filteredData);
      vis.updateData();
    }


    // Use to update dots with new data
    updateData() {
        let vis = this;


        // variable to set the radius of the dots
        vis.radius = vis.theMap.getZoom() * 2;
        
        // Rebind the new data to the dots selection.
        // Use a key function if you have a unique identifier.
        vis.Dots = vis.svg.selectAll('circle')
            .data(vis.filteredData, d => d.id)
            .join(
                enter => enter.append('circle') // create a new dot
                                .attr("fill", d => vis.colorScale(d[vis.currentSelection]))
                                .attr("stroke", "black")
                                .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x)
                                .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y)
                                .attr("r", vis.radius)
                                
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
                                    d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                                        .duration('150') //how long we are transitioning between the two states (works like keyframes)
                                        .attr("fill", d => vis.colorScale(d[vis.currentSelection])) //change the fill  TO DO- change fill again
                                        .attr("r", vis.radius) // change radius back
                
                                        d3.select('#tooltip').style('display', 'none'); // turn off the tooltip
                                }),
                update => update, // keep dot
                exit => exit.remove() // remove dot
            );

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
            .style("left", "-45px")
            .style("top", "5px")
            .style("padding", "5px")
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
            .style("left", "-135px")      // Adjust horizontal position as needed
            .style("top", "420px")        // Adjust vertical position as needed
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
        
        vis.buttonText = "Enter Selection Mode"
        // Map Area Select Button
        vis.areaSelectButton = d3.select("div.leaflet-top.leaflet-left")
            .append("button")
            .attr("id", "area-button")
            .text(vis.buttonText)
            .style("position", "absolute")
            .style("left", "50px")      // Adjust horizontal position as needed
            .style("top", "10px")        // Adjust vertical position as needed
            .style("width", "140px")
            .style("background-color", "white")
            .style("padding", "15px 15px")
            .style("border", "1px solid black")
            .style("border-radius", "5px")
            .style("flex-grow", "1")
            .style("cursor", "pointer")
            .style('pointer-events', 'all') // allow pointer events
            .on("click", function() {
              vis.toggleSelectionArea();
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
}