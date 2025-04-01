# The Earth Beneath Us

#### Contributors

- Casey Jackson
- Ricky Roberts

## Documentation

Earthquakes are powerful natural phenomena that can cause devastating loss of life, property, and infrastructure. While public awareness is often focused on well-known fault lines like those in California or Japan, seismic activity also occurs in less-expected regions—such as the Midwest of the United States—highlighting the importance of comprehensive global monitoring and analysis.

![entire app screenshot](/docs/documentation-files/entire-app.png)

This application is motivated by the need to make earthquake data more accessible, interpretable, and interactive for the general public. By visualizing seismic events over the past 10 years, the project seeks to: 

- Enhance spatial awareness of earthquake occurances
- Help identify patterns in frequency, magnitude, depth, and geographical distribution
- Encourage data-driven exploration by allowing users to engage with and analyze seismic patters through filters, color encodings, and animations

This earthquake visualization application enables users to explore and understand regional earthquake patterns, the global timeline of seismic activity, and the relationships between location, magnitude, and depth. 

**Link to Application:** [rickslick3.github.io/earth-beneath-us/](https://rickslick3.github.io/earth-beneath-us/) <br/>
**Link to Demonstration:** TODO

### The Data

The data used for this application is from the [United States Geological Survey Earthquake Catalog](https://earthquake.usgs.gov/earthquakes/search/). The USGS monitors and reports on earthquakes, assesses earthquake impacts and hazards, and conducts targeted research on the causes and effects of earthquakes. The U.S. Geological Survey offers a data portal that allows users to query and download comprehensive earthquake data. For this project, we are focusing exclusively on earthquakes with a magnitude of 2.5 or higher.

**Data sample:** [2025.csv](/docs/data/2025.csv)

### Visualization Interaction

The map offers several interactive features and filtering options:

1. **Area Selection:** By selecting the "Enter Selection Mode" button, the user can click and drag to cover an area on the map. The data will filter to only display earthquakes within the selcted area on the map. 

![Filter by Area](/docs/documentation-files/area-selection.png)

2. **Timeline Brushing:** By selecting the "Toggle Brushing" button, the user can see what dates the data is filtered by in the area chart. The user can select either edge to increase or decrease the timespan, or drag the brushing area to filter the displayed data by a different timespan entirely. 

![Filter by Time](/docs/documentation-files/timeline-brushing.png)

3. **Filtering by Depth and Magnitude:** By selecting the "Toggle Heatmap" button, the user can see the distribution of the displayed earthquakes by magnitude and depth. The user can also select multiple heatmap bins to filter the displayed data by specific magnitudes or depths. 

![Filter by Depth and Magnitude](/docs/documentation-files/heatmap-filter.png)

4. **Animate Over Time:** By selecting the "Animate Days" button to show a day by day animation of the filtered points within the selected timespan in the area chart. 

![Animate Over Time](/docs/documentation-files/animation.png)

**Tip:** To achieve unique results, try using multiple filters before animating the points. 

# TO DO

- 1 section on the visualization components: Explain each view of the data, the GUI, etc.  Explain how - you can interact with your application, and how the views update in response to these interactions. 

- This time, include a section with your design sketches and design justifications.

- 1 section on what your application enables you to discover: Present some findings you arrive at with your application. 

- 1 section on your process- what libraries did you use?  How did you structure your code?  How can you access it and run it? 

- Include a 2-3 minute demo video, showing your application in action.  The easiest way to record this is with a screen capture tool, which also captures audio- such as Quicktime.  Use a voiceover or video captions to explain your application.  Demo videos should be sufficient on their own, but can reference your documentation.  Include the name of the project, your name, the project components, and how your application works.  You can present it on your webpage or on youtube, but linked on your webpage. 

- This time, document who on your team did which component of the project.  Ex.  If someone worked on the data, and on bar charts, list their effort on these components. 
