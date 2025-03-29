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
    leafletMap = new LeafletMap({ parentElement: '#my-map' }, subsetData);

    // Instantiate the heatmap with an onBinSelection callback.
    const heatmap = new Heatmap({
      parentElement: "#heatmap",  // Ensure your HTML has a container with id "heatmap"
      width: 500,
      height: 500,
      margin: { top: 20, right: 20, bottom: 40, left: 40 },
      xBins: 20,
      yBins: 20,
      onBinSelection: filteredData => {
        // Update the map data when bin selection changes.
        leafletMap.updateData(filteredData);
      }
    }, subsetData);

    // Instantiate the area chart and update both the map and heatmap on brush changes.
    areaChart = new AreaChart({ parentElement: '#context' },
      subsetData,
      filteredData => {
        leafletMap.setFilteredDataAndUpdate(filteredData);
        heatmap.setFilteredDataAndUpdate(filteredData);
      });
  })
  .catch(error => console.error(error));