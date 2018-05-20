

# NYU Stern School of Business - Rooms

> Keywords: Mapas, Visualización, Localización

**Descripción datasets:**

 - [Neighborhood Names GIS][https://catalog.data.gov/dataset/neighborhood-names-gis][Json] Posee informacion de los barrios de NY.
 - [NY Districts geoshapes][https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson][GeoJson] Posee información de los Distritos de NY y sus formas (polígonos).
 - [Crimes in NY][https://data.cityofnewyork.us/Public-Safety/NYPD-Complaint-Data-Historic/qgea-i56i/data][Json]Base de datos con reportes de crímenes en NY con lugar de ocurrencia(lat,long), entidad que lo reporta, hora de ocurrencia y una descripción  breve del suceso.
 - [Dataset contains information on New York City housing by building data][https://catalog.data.gov/dataset/housing-new-york-units-by-building][Json] Información de viviendas asequibles. Dicha información incluye su ubicación.

Se mejora la visualizacion en los mapas, se espera que para la proxima entrega se realizen tablas para visualizar informacion y generar la descarga de csv, y en la ultima entrega incluir graficos con 3djs.
*Nota: ver javascript.*

**Descripción breve:**
El proyecto es un mashup que incluye un mapa para visualizar información y ordenarla. El mapa incluye una sección en la que se van a añadir gráficos de D3.js que muestren el desempeño del distrito seleccionado. Aquí se pueden seleccionar los barrios a comparar en siguiente sección.

En la sección de comparación se pretende generar una vista para comparar varios barrios/viviendas seleccionadas en el mapa, y determinar que valores se quieren considerar para clasificarlas.

En la sección de descargas se le permite al usuario generar un informe con los datos que el desee incluir y generar un csv.

**Descripción:**
-   Map View:
    1.  [Y] El mapa esta centrado sobre la NYU Stern School of Business.
    2.  [Y] [Boroughs]El mapa hasta el momento incluye una vista basica de los boroughs y los permite cargar independientemente, y permite tambien seleccionar por distritos y decidir que informacion desea mostrar(museos, viviendas, barrios,etc).
    3. [N] Se puede explorar de forma diferente el mapa haciendo uso de las pestañas incluidas en la barra de opciones del mapa. Cada pestaña permite visualizar los datos de forma diferente.
-   Data Visualization:

    1.  [N]Aún no hay uso de gráficos, sin embargo ya hay una parte dispuesta para ello.
-   Interaction Form:

    1.  [Y]El mapa ya dispone de las funcionalidades deseadas para visualizar de formas diferentes el mapa.

6.  Test Case:
Hasta el momento se ha probado en Firefox y Chrome, y el desempeño de la aplicación ha sido similar. También se ha probado la aplicación con las funcionalidades de estos navegadores para simular un ambiente móvil, y se ha demostrado que funciona responsivamente.
