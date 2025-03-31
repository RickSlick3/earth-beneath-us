// main.js

// We use d3.timeParse() to convert a string into JS date object
// Initialize helper function
const parseTime = d3.timeParse("%Y-%m-%d");

// Years
if (!localStorage.getItem('availableYears')) {
  localStorage.setItem('availableYears', JSON.stringify(['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'])); // Store available years in local storage
}
const year = localStorage.getItem('year');
if (!year) {
  localStorage.setItem('year', '2025');
}
console.log("Year set for visualization: " + year);

// Charts
if (!localStorage.getItem('showHeatmap')) {
  localStorage.setItem('showHeatmap', 'false');
}
if (!localStorage.getItem('showAreaChart')) {
  localStorage.setItem('showAreaChart', 'false');
}

// Maps
const mapType = localStorage.getItem('mapType')
if (!mapType) {
  localStorage.setItem('mapType', 'terrain');
}
console.log("Map set for visualization: " + mapType);
if (!localStorage.getItem('availableMaps')) {
  localStorage.setItem('availableMaps', JSON.stringify(['terrain', 'topograph', 'street', 'contrast']))
}

d3.csv(`data/${year}.csv`)  //**** TO DO  switch this to loading the quakes 'data/2024-2025.csv'
  .then(data => {
    console.log("number of items: " + data.length);

    data.forEach(d => {  // convert from string to number
      d.latitude = +d.latitude; 
      d.longitude = +d.longitude; 
      d.mag = +d.mag; 
      d.depth = +d.depth;
      d.date = parseTime(d.time.substring(0, 10));
      
      delete d.horizontalError;
      delete d.depthError;
      delete d.magError;
      delete d.magNst;
      delete d.status;
      delete d.locationSource;
      delete d.magSource;
      delete d.net;
      delete d.nst;
      delete d.gap;
      delete d.dmin;
      delete d.rms;
      delete d.net;
      delete d.updated;
      delete d.magType;
    });

    //const subsetData = data.filter((d, i) => d.type == "earthquake" && i < 8000);
    const subsetData = data.filter(d => 
      d.type == "earthquake" && d.mag >= 2.5 &&
      d.latitude != null && d.latitude !== '' && !isNaN(d.latitude) &&
      d.longitude != null && d.longitude !== '' && !isNaN(d.longitude) &&
      d.mag != null && d.mag !== '' && !isNaN(d.mag) &&
      d.depth != null && d.depth !== '' && !isNaN(d.depth) &&
      d.date != null && d.date !== '' // and any other checks you want, e.g. date validity
    );

    // Create a frequency map where the key is the time (in milliseconds)
    // and the value is the count of earthquakes on that day.
    const frequencyMap = d3.rollup(
      subsetData,
      v => v.length,
      d => d.date.getTime()  // using getTime() so keys are numbers
    );

    // Now assign the frequency count to each record as a new attribute 'freq'
    subsetData.forEach(d => {
      d.freq = frequencyMap.get(d.date.getTime());
    });

    // full doman extents of the data for the heatmap
    let xDomain = d3.extent(subsetData, d => d.mag);
    let yDomain = d3.extent(subsetData, d => d.depth);
    console.log('xDomain: ', xDomain);
    console.log('yDomain: ', yDomain);

    let allAreaBrushData = subsetData; // This will hold the data for resetting the heatmap after animation

    console.log('subset data length: ', subsetData.length);
    console.log('subset data: ', subsetData);

    // Initialize the map.
    leafletMap = new LeafletMap({ parentElement: '#my-map' }, 
      subsetData,
      filteredData => {
        areaChart.data = filteredData;
        areaChart.updateVis();
      },
      disableInteraction,
      enableInteraction,
      onDayCallback = onAnimationDayChanged,
      onDayHeatmapUpdate = onAnimationDayHeatmapUpdate
    );

    // Instantiate the heatmap with an onBinSelection callback.
    const heatmap = new Heatmap({
      parentElement: "#heatmap",  // Ensure your HTML has a container with id "heatmap"
      width: 250,
      height: 250,
      margin: { top: 20, right: 20, bottom: 40, left: 50 },
      xBins: 20,
      yBins: 20,
      xDom: xDomain, // Use the xDomain from the data
      yDom: yDomain, // Use the yDomain from the data
      onBinSelection: filteredData => {
        // Update the map data when bin selection changes.
        leafletMap.setTimeFilteredDataAndUpdate(filteredData);
      }
    }, subsetData);

    // Instantiate the area chart and update both the map and heatmap on brush changes.
    areaChart = new AreaChart({ parentElement: '#area-chart', contextWidth: 850 },
      subsetData,
      filteredData => {
        leafletMap.setTimeFilteredDataAndUpdate(filteredData);
        heatmap.updateData(filteredData);
        allAreaBrushData = filteredData;
      });

    // Callback functions
    function disableInteraction() {
      areaChart.canBrush = false;
      areaChart.toggleBrushPointerEvents();
      heatmap.disableBinClicks();
      areaChart.hideBrushLabels();
    }
    function enableInteraction() {
      areaChart.canBrush = true;
      areaChart.toggleBrushPointerEvents();
      heatmap.enableBinClicks();
      areaChart.showBrushLabels();
    }
    
    function onAnimationDayChanged(date) {
      // If date is a string like '2025-01-12', parse it
      // or if you already have a Date object, just pass it through
      areaChart.setAnimationDateLine(date);
    }
    function onAnimationDayHeatmapUpdate(dayRecords, endOfAnimation) {
      // This line ensures the heatmap is recalculated *only* for these dayRecords
      if (endOfAnimation) {
        heatmap.updateData(allAreaBrushData);
      } else{
        heatmap.updateData(dayRecords);
      }
    }

    // choose to display or hide the area chart and heatmap based on local storage settings
    const heatmapElement = d3.select('#heatmap');
    const areachartElement = d3.select('#area-chart');

    if (localStorage.getItem('showHeatmap') === 'true') {
      heatmapElement.style('display', 'block');
    }
    if (localStorage.getItem('showAreaChart') === 'true') {
      areachartElement.style('display', 'block');
    }
  })
  .catch(error => console.error(error));