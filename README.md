


# NYU Stern School of Business - Rooms

> Keywords: Maps, visualization, ranking, stats, downloads, explore, compare, data standardization

**Descripción datasets:**

 - [Neighborhood Names GIS][https://catalog.data.gov/dataset/neighborhood-names-gis][Json] This dataset contains information about the NY neighborhoods. We take from this dataset the ***borough*** and the ***the_geom*** to determine where does the neighborhood belong. We also use the ***name*** because it has the neighborhood name.
 - [NY Districts geoshapes][https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson][GeoJson] This dataset provides information about the shape of the distrcts and boroughs. We use the property ***BoroCD*** to determine the district and the borough that is described by the ***geometry***. The shape in this dataset could be a Multipolygon, that is the reason we check the property ***type*** of ***geometry*** and build the polygon accordingly.
 - [Crimes in NY][https://data.cityofnewyork.us/Public-Safety/NYPD-Complaint-Data-Historic/qgea-i56i/data][Json] This database has information of crime reports in New York between 2006 and 2016. From this dataset we use ***boro_nm***, ***ofns_desc*** that is the description of the crime, ***lat_lon***  and ***cmplnt_fr_dt*** that is the date.
 - [Dataset contains information on New York City housing by building data][https://catalog.data.gov/dataset/housing-new-york-units-by-building][Json] From this dataset we take the the fields ***borough***, ***latitude, longitude*** and ***extremely_low_Income_units*** to determine the amount of units per district.
 - [NYC Transit Subway Entrance And Exit Data][https://data.ny.gov/Transportation/NYC-Transit-Subway-Entrance-And-Exit-Data/i9wp-a4ja][Json] It has information about the stations like its location, name, address, etc. This dataset is allowed by https://catalog.data.gov/dataset/open-ny-gov-api-catalog that is included in the datasets allowed by the competition.
 - [New York City Museums][https://catalog.data.gov/dataset/new-york-city-museums][Json] It has information about museums in NY. we use ***the_geom*** to deterimne where does the data belongs to. We also use ***name***, ***tel*** and ***url***.

**Brief description:**
The application is a mashup that is able to find the best place to live in NY based on the data provided. The layout of the web page consistst of three parts(views).

On top of all is the map view. There the users can interact with the map, visualize the information and also view the data colected from the datasets. There is also a ranking table linked to the map (interacts with the map).

In the middle of the web page is the "Dahsboard" view. There the user can pick up to 5 districts from a rank table and compare them (d3 data visualization). At the end of the section are some tables showing rankings ordered by other criteria.

The last view allows users to explore the data, and download in *csv format.

**Descripción:**
 * Map View:
	1. [Y] The map starts centered at NYU as required by the contest.
	2. [Y] [Heatmap] The user can enable a heatmap showing the crimes in the city.
	3. [Y] [Polygon] The user can see the shape of the district chosen, and also the borough where it belongs to. In other view the user can chose various districts at a time and visualize the information related to them at once.
	4. [Y][Markers] There are a variety of markers to chose and visualize in the map. The markers have custom icons to distinguish them from each other.

 * Data Visualization:
	1. [Y] [Bubbles] In the map view is a bubble graph that shows the information of the current district. The bubble chart changes automatically when the user performes a change in the query.
	2. [Y] [Dashboard Interactions] The dashboard is designed to allow the user to compare up to 5 districts. The user can pick items form a table and it will update the graphs made with d3js automatically. For this visualization we have a bar chart an ring charts.

 * Interaction Form:
	1. [Y] [Table] In the Dashboard section the user can pick up to five districts and compare them.
	2. [Y] [Checkbox] In the map view the user can select which markers to see.
	3. [Y] [Table] In the map view, in the rank section the user can interact with the rankng and it will update the map and the bubble graph.
	4. [Y] [Buttons] The user can visualize a small part of the tables before downloadig them. The user can download the table that is currently enabled.
	5. [Y] [List-Maps] The user can switch the way he visualizes the map. The tabs "Find", "Explore" and "Ranking" provides different ways to see the data and help the user with his final decision.

6. Test Case
I tested the app in Firefox and Chrome and the performance has been similar. Using the mobile-view provided by these browsers, I tested its responsive performane.

7. Additional information You Want to Share with Us
	-	The data ranking is performed with a ***standardization***, not normalization.
	-	The page requires at least a second to load while it performs the ranking data standarization.
	-	The graphs and the tables are designed way to similar to a ***component***. What I mean, is that the tables are configurable without changing the code, just receiving custom parameters (for example a ***bitmask*** to determine which rows to show). This makes it easier to reuse some components (For example, all ranking tables are created with the same component, and all charts can be created by passing the required parameters to the function).
	-	The data (almost all) is stored in a big object called boroughs. It provides an easy way to acces to certain elements with a syntactic expression. What I mean with this is that for example, If I need the distance of the district 3 of the borough 2 I could access to the information like ***boroughs[2].districts[3].distance***
