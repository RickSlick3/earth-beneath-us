// main.js

// We use d3.timeParse() to convert a string into JS date object
// Initialize helper function
const parseTime = d3.timeParse("%Y-%m-%d");

d3.csv('data/2024-2025.csv')  //**** TO DO  switch this to loading the quakes 'data/2024-2025.csv'
  .then(data => {
    console.log("number of items: " + data.length);

    data.forEach(d => {  // convert from string to number
      d.latitude = +d.latitude; 
      d.longitude = +d.longitude;  
      d.depth = +d.depth;
      d.date = parseTime(d.time.substring(0, 10));
    });

    const subsetData = data.filter((d, i) => d.type == "earthquake" && i < 8000); // 3116 gives only 2025 data
    let filteredAreaData = subsetData;
    let filteredDataFinal = subsetData;

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

    console.log('subset data: ', subsetData);

    // Initialize the map.
    leafletMap = new LeafletMap({ parentElement: '#my-map' }, 
      subsetData,
      filteredData => {
        areaChart.data = filteredData;
        areaChart.updateVis();
      },
      disableBrush,
      enableBrush,
      onDayCallback = onAnimationDayChanged,
      onDayHeatmapUpdate = onAnimationDayHeatmapUpdate
    );

    let xDomain = d3.extent(subsetData, d => d.mag);
    let yDomain = d3.extent(subsetData, d => d.depth);

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
      });

    // Callback functions
    function disableBrush() {
      areaChart.canBrush = false;
      areaChart.toggleBrushPointerEvents();
    }
    function enableBrush() {
      areaChart.canBrush = true;
      areaChart.toggleBrushPointerEvents();
    }
    function onAnimationDayChanged(date) {
      // If date is a string like '2025-01-12', parse it
      // or if you already have a Date object, just pass it through
      areaChart.setAnimationDateLine(date);
    }
    function onAnimationDayHeatmapUpdate(dayRecords) {
      // This line ensures the heatmap is recalculated *only* for these dayRecords
      heatmap.updateData(dayRecords);
    }
  })
  .catch(error => console.error(error));