# The Earth Beneath Us

#### Contributors

- Casey Jackson
- Ricky Roberts

## Documentation

Earthquakes are powerful natural phenomena that can cause devastating loss of life, property, and infrastructure. While public awareness is often focused on well-known fault lines like those in California or Japan, seismic activity also occurs in less-expected regions—such as the Midwest of the United States—highlighting the importance of comprehensive global monitoring and analysis.

![entire app screenshot](/documentation-files/entire-app.png)

This application is motivated by the need to make earthquake data more accessible, interpretable, and interactive for the general public. By visualizing seismic events over the past 10 years, the project seeks to: 

- Enhance spatial awareness of earthquake occurances
- Help identify patterns in frequency, magnitude, depth, and geographical distribution
- Encourage data-driven exploration by allowing users to engage with and analyze seismic patters through filters, color encodings, and animations

This earthquake visualization application enables users to explore and understand regional earthquake patterns, the global timeline of seismic activity, and the relationships between location, magnitude, and depth. 

**Link to Application:** [rickslick3.github.io/earth-beneath-us/](https://rickslick3.github.io/earth-beneath-us/) <br/>
**Link to Demonstration:** TODO

### The Data

The data used for this application is from the [United States Geological Survey Earthquake Catalog](https://earthquake.usgs.gov/earthquakes/search/). The USGS monitors and reports on earthquakes, assesses earthquake impacts and hazards, and conducts targeted research on the causes and effects of earthquakes. The U.S. Geological Survey offers a data portal that allows users to query and download comprehensive earthquake data. For this project, we are focusing exclusively on earthquakes with a magnitude of 2.5 or higher.

**Data sample:** [2025.csv](/data/2025.csv)

### Visualization Interaction

The map offers several interactive features and filtering options:

1. **Area Selection:** By selecting the "Enter Selection Mode" button, the user can click and drag to cover an area on the map. The data will filter to only display earthquakes within the selcted area on the map. 

![Filter by Area](/documentation-files/area-selection.png)

2. **Timeline Brushing:** By selecting the "Toggle Brushing" button, the user can see what dates the data is filtered by in the area chart. The user can select either edge to increase or decrease the timespan, or drag the brushing area to filter the displayed data by a different timespan entirely. 

![Filter by Time](/documentation-files/timeline-brushing.png)

3. **Filtering by Depth and Magnitude:** By selecting the "Toggle Heatmap" button, the user can see the distribution of the displayed earthquakes by magnitude and depth. The user can also select multiple heatmap bins to filter the displayed data by specific magnitudes or depths. 

![Filter by Depth and Magnitude](/documentation-files/heatmap-filter.png)

4. **Animate Over Time:** By selecting the "Animate Days" button to show a day by day animation of the filtered points within the selected timespan in the area chart. 

![Animate Over Time](/documentation-files/animation.png)

**Tip:** To achieve unique results, try using multiple filters before animating the points. 

- TODO: 1 section on what your application enables you to discover: Present some findings you arrive at with your application. 

## Design Choices an Process

Below is a list of links to our design plans and digital sketches:

- [Design Plan Charts](/documentation-files/design-plan-charts.pdf)
- [Design Plan 1](/documentation-files/design-plan-1.pdf)
- [Design Plan 2](/documentation-files/design-plan-2.pdf)

### Designs

Our ideas were chosen based on the project requirements. As per the project requirements, the user needs to be able to filter earthquakes by time, magnitude, and depth. Our final decision was the combination of a timeline and a heatmap. The timeline enables the user to filter the displayed data by a specific timeframe. The heatmap enables the user to filter by magnitude, depth, or a specific intersection of these two attributes. We planned that these filters would be linked and for the user to be able to make specific filter combinations between the two visualizations. 

With our initial desings, our plan was to make the map the focus of attention while also making the charts present while panning and zooming. The initial design was made with the intention for the map to be the main focus, while having the charts be ever-present for filtering. This idea was later changed to make the map the enitre screen, and for the charts to be overlayed with the option to display or hide them individually. We settled on this idea for our final design to allow the user to have maximum visibility of the map. When the charts are not displayed, the user can pan and zoom, watch the animations, and use the other functionality while the map is the full screen size.

### Structure and Libraries

We structured our code in multiple files to separate key aspects of our app. We have a separate file for our map, area chart, and heatmap. These files are linked using callbacks, functions that connect the instances of each key aspect in our main file. This allows applying filters or updating data using one visualization to change values in the others if applicable. This overall structure of our project allows code to be compartmentalized while also being able to link through a common function or file. 

In this project, we used [leaflet](https://leafletjs.com/) for our map and map tiles, [D3.js](https://d3js.org/) for our area chart and heatmap, and [tz.js](https://github.com/photostructure/tz-lookup) and [moment.js](https://momentjs.com/timezone/) to get the timezone and local time of each earthquake. 

This project can be accessed publicly [HERE](https://rickslick3.github.io/earth-beneath-us/).

## Contributions

#### Casey Jackson:

...

#### Ricky Roberts:

Created the area chart, created the brushing and time filtering, added infromation to th brush window. Created the heatmap and bins. Added the animation feature. Added year selector for data. Added the map selector for different map tiles. Added legend and buttons to switch color by data attributes. 