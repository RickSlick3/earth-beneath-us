d3.csv('data/2024-2025.csv')  //**** TO DO  switch this to loading the quakes 'data/2024-2025.csv'
.then(data => {
    console.log("number of items: " + data.length);

    data.forEach(d => {  //convert from string to number
      d.latitude = +d.latitude; 
      d.longitude = +d.longitude;  
    });

    // const subsetData = data.filter(d => d.magSource == "us");
    // const subsetData = data.filter((d, i) => i < 500);
    const subsetData = data.filter((d, i) => d.type == "earthquake" && i < 3000)

    // Initialize chart and then show it
    leafletMap = new LeafletMap({ parentElement: '#my-map'}, subsetData);
    
    // sample of how to update the data
    // leafletMap.updateData(subsetData.filter((d, i) => d.type == "earthquake" && i < 100));
  })
  .catch(error => console.error(error));