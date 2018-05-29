dt/*Ranking Script*/
/* --------------------- Load the datasets -------------------------*/

var URLS = [
    {name: "geoshapes", url:"https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson"},
    {name: "neighborhood_names", url:"https://data.cityofnewyork.us/api/views/xyye-rtrs/rows.json?accessType=DOWNLOAD"},
    {name: "housing", url:"https://data.cityofnewyork.us/api/views/hg8x-zxpr/rows.json?accessType=DOWNLOAD"},
    {name: "museums", url:"https://data.cityofnewyork.us/api/views/fn6f-htvy/rows.json?accessType=DOWNLOAD"},
    {name: "subway", url:"https://data.ny.gov/api/views/i9wp-a4ja/rows.json?accessType=DOWNLOAD"},// Allowed by: https://catalog.data.gov/dataset/nyc-transit-subway-entrance-and-exit-data
    {name: "crime", url:"https://data.cityofnewyork.us/api/views/qgea-i56i/rows.json?accessType=DOWNLOAD"},
];

var boroR = {"Manhattan":"1","Bronx":"2","Brooklyn":"3","Queens":"4","Staten Island":"5"};
var boroRCAPS = {"MANHATTAN":"1","BRONX":"2","BROOKLYN":"3","QUEENS":"4","STATEN ISLAND":"5"};

var iconUrls = {
    house:"https://raw.githubusercontent.com/ermahechap/Ironhacks/master/src/house.png",
    museum:"https://raw.githubusercontent.com/ermahechap/Ironhacks/master/src/museum.png",
    neighborhood:"https://raw.githubusercontent.com/ermahechap/Ironhacks/master/src/neighborhood.png",
    uni:"https://raw.githubusercontent.com/ermahechap/Ironhacks/master/src/uni.png",
    subway:"https://raw.githubusercontent.com/ermahechap/Ironhacks/master/src/train.png"
}

var boroughs = { // in this one we build the "dataframe"
    "1": {boro_name:"Manhattan",color: "#1c00ff",districts:[]},//1
    "2": {boro_name:"Bronx",color: "#fc9c0e",districts:[]},//2
    "3": {boro_name:"Brooklyn",color:"#00ff0f",districts:[]},//3
    "4": {boro_name:"Queens",color: "#ff0000",districts:[]},//4
    "5": {boro_name:"Staten Island",color: "#fff500",districts:[]}//5
};

var nonHabitable = 20;//all district with bumer over 50 are not habitable.
var nonHabitableColor = "#000000";
//new way to handle data, it is better and more organized
var geoshapesData,neighborhoodData,housingData,museumsData,crimeData,subwayData;

var neighborhoodHeaders,housingHeaders,museumsHeaders, crimeHeaders,subwayHeaders;

function processGeoshapes(){
    let len = geoshapesData.length;
    for(let i = 0 ; i <len;i++){
        let boroCD = geoshapesData[i].properties.BoroCD/100.0>>0;
        let boroID = geoshapesData[i].properties.BoroCD - (boroCD*100);
        let mPol = createPolygon(geoshapesData[i].geometry)
        let isHabitable = (boroID<nonHabitable)
        mPol.setOptions({
            fillColor: (isHabitable)?boroughs[boroCD].color : nonHabitableColor,
            strokeColor:"#5a5e4b",
            strokeOpacity:0.5,
            strokeWeight: 2
        });
        let center = mPol.my_getBounds().getCenter();
         //Template of values for each boro
        boroughs[boroCD].districts.push({
            boro_id:boroCD,
            number:boroID,
            poly: geoshapesData[i].geometry,
            mapsPolygon: mPol,//polygon
            borough_center: center,
            neighborhoods: [],
            housing: [],
            museums: [],
            crimes: [],
            subways:[],
            number_units: 0,
            number_museums: 0,
            number_crimes: 0,
            number_subs:0,
            distance: latLngDistances(coordNYU,{lat:center.lat(), lng:center.lng()}),
            habitable: isHabitable
        });
    }
}

function processNeighborhoods(){
    let lenData = neighborhoodData.length;
    for(let i = 0 ; i < lenData; i++){
        let id = boroR[neighborhoodData[i][16]];
        let point = parser(neighborhoodData[i][9]);
        let lenDist = boroughs[id].districts.length;
        for(let j = 0 ; j < lenDist ; j++){
            if(inOutMapsD3(point,boroughs[id].districts[j].poly)){
                boroughs[id].districts[j].neighborhoods.push({
                    name:neighborhoodData[i][10],
                    location:point,
                    mapsLocation: new google.maps.Marker({
                        position:point,
                        icon:createIcon(iconUrls.neighborhood),
                        title: neighborhoodData[i][10]
                    })
                });
                break;
            }
        }
    }
}

function processHousing(){
    let lenData = housingData.length;
    for(let i = 0 ; i < lenData; i++){
        let id = boroR[housingData[i][15]];
        if(housingData[i][23]==null)continue; // exclude housese without lat lng
        let point = {lat: parseFloat(housingData[i][23]) , lng:parseFloat(housingData[i][24])};
        let lenDist = boroughs[id].districts.length;
        for(let j = 0 ; j < lenDist ; j++){
            if(inOutMapsD3(point,boroughs[id].districts[j].poly)){
                boroughs[id].districts[j].housing.push({
                    name:housingData[i][9],
                    location:point,
                    mapsLocation: new google.maps.Marker({
                        position:point,
                        icon: createIcon(iconUrls.house),
                        title: housingData[i][9]
                    }),
                    lowIncome:parseInt(housingData[i][31])
                });
                boroughs[id].districts[j].number_units += parseInt(housingData[i][31]);//add low income units
                break;
            }
        }
    }
}

function processMuseums(){
    let lenData = museumsData.length;
    for(let i = 0 ; i < lenData ; i++){
        let id = -1;
        let point = parser(museumsData[i][8]);
        //quite greedy, but there is no other way but check all districts because the data has no district info
        for(let j = 1 ; j <=5 ; j++){//boro
            let lenDist = boroughs[j].districts.length;
            for(let k = 0 ; k < lenDist ; k++){//district
                if(inOutMapsD3(point,boroughs[j].districts[k].poly)){
                    boroughs[j].districts[k].museums.push({
                        name: museumsData[i][9],
                        location:point,
                        mapsLocation: new google.maps.Marker({
                            position:point,
                            icon: createIcon(iconUrls.museum),
                            title:museumsData[i][9]
                        }),
                        address: museumsData[i][12] + " - " + museumsData[i][13],
                        tel: museumsData[i][10],
                        url: museumsData[i][11]
                    });
                    boroughs[j].districts[k].number_museums++;
                    break;
                }
            }
        }
        if(id == -1)continue;
    }
}

function processSubway(){
    let lenData = subwayData.length;
    for(let i = 0 ; i<lenData; i++){
        let point = {lat: parseFloat(subwayData[i][36]), lng: parseFloat(subwayData[i][37])};
        for(let j = 1 ; j<=5 ; j++){
            let lenDist = boroughs[j].districts.length;
            for(let k = 0 ; k<lenDist;k++){
                if(inOutMapsD3(point,boroughs[j].districts[k].poly)){
                    boroughs[j].districts[k].subways.push({
                        name:subwayData[i][10],
                        location:point,
                        mapsLocation: new google.maps.Marker({
                            position:point,
                            icon: createIcon(iconUrls.subway),
                            title: subwayData[i][10] + " station - line " + subwayData[i][9] + " - " +subwayData[i][35]
                        }),
                        linie: subwayData[i][9],
                        corner:subwayData[i][35],
                    })
                    boroughs[j].districts[k].number_subs++;
                    break;
                }
            }
        }
    }
}

var heatmapCrimeShow, pointsHeatCrimes = [];
function processCrime(){
    let lenData = crimeData.length;
    for (let i = 0 ; i<lenData;i++){
        let id = boroRCAPS[crimeData[i].boro_nm];
        let point = {lat: parseFloat(crimeData[i].latitude), lng:parseFloat(crimeData[i].longitude)};
        let pt = new google.maps.LatLng(point.lat,point.lng);
        pointsHeatCrimes.push(pt);
        let lenDist = boroughs[id].districts.length;
        for(let j = 0 ; j <lenDist;j++){
            if(inOutMapsD3(point,boroughs[id].districts[j].poly)){
                boroughs[id].districts[j].crimes.push({
                    description:crimeData[i].ofns_desc,
                    date:crimeData[i].cmplnt_fr_dt,
                    location:point,
                    mapsPoint: pt
                });
                boroughs[id].districts[j].number_crimes++;
                break;
            }
        }
    }
    heatmapCrimeShow = new google.maps.visualization.HeatmapLayer({
        data:pointsHeatCrimes,
        gradient:[
            'rgba(0, 255, 255, 0)',
            'rgba(0, 255, 255, 1)',
            'rgba(0, 191, 255, 1)',
            'rgba(0, 127, 255, 1)',
            'rgba(0, 63, 255, 1)',
            'rgba(0, 0, 255, 1)',
            'rgba(0, 0, 223, 1)',
            'rgba(0, 0, 191, 1)',
            'rgba(0, 0, 159, 1)',
            'rgba(0, 0, 127, 1)',
            'rgba(63, 0, 91, 1)',
            'rgba(127, 0, 63, 1)',
            'rgba(191, 0, 31, 1)',
            'rgba(255, 0, 0, 1)'
       ]
    });
}

function loadData(){
    $.when(
        $.getJSON(URLS[0].url,function(data){geoshapesData = data.features;
        }).fail(function(){alert("Couldn't load geoshapes, please reload the page!");
        }).done(function(){console.log("Geoshapes loaded");}),
        $.getJSON(URLS[1].url,function(data){neighborhoodData = data.data;
        }).fail(function(){alert("Couldn't load neighborhoods, please reload the page!");
        }).done(function(){console.log("Neighborhoods loaded");}),
        $.getJSON(URLS[2].url,function(data){housingData = data.data;
        }).fail(function(){alert("Couldn't load housing, please reload the page!");
        }).done(function(){console.log("Housing loaded");}),
        $.getJSON(URLS[3].url,function(data){museumsData = data.data;
        }).fail(function(){alert("Couldn't load museums, please reload the page!");
        }).done(function(){console.log("Museums loaded");}),
        $.ajax({
            url: "https://data.cityofnewyork.us/resource/9s4h-37hy.json?$where=latitude IS NOT NULL AND longitude IS NOT NULL",
            type: "GET",
            data: {
                "$limit": 5000,
                "$$app_token": "LsbMCOtwH1ZSzEhm10cXMFk1U"
            }
        }).fail(function(data){alert("Couldn't load crimes, please reload the page!");
    }).done(function(data){crimeData = data;console.log("Crime loaded");}),
    $.getJSON(URLS[4].url,function(data){subwayData=data.data;
    }).fail(function(){alert("Couldn't load subway, please reload the page!");
}).done(function(){console.log("Subway Loaded");})
    ).then(function(){
        processGeoshapes();
        processNeighborhoods();
        processHousing();
        processMuseums();
        processSubway();
        processCrime();
        generateRankingStuff();
        //create selector for tab1 of map
        for(var i = 1 ; i<=5;i++){
            $('#boro-map').append('<option value="' + i + '">' + boroughs[i].boro_name+ '</option>');
        }

        //leztes
        $(".downloads-select input[value = 1]").trigger("click");//awful, but meh!
    })
}
/*----------------------------------------Scripts Ranking--------------------------------*/

function generateRankingStuff(){
    //Ranking
    createRankDataFrame();
    //create ranks for dashboard, by characteristic
    rankFunction("safety_score");
    createtable("#table-crimes-rank",39,10);
    rankFunction("affordability_score");
    createtable("#table-units-rank",23,10);
    rankFunction("distance_score");
    createtable("#table-distance-rank",15,10);

    //Map and dashboard general rank
    rankFunction("overall_score");
    createtable("#table-ranking-map",263,null);//263 is a bitmask, check function for details
    createtable("#table-ranking-dashboard",511,null);
    dashboardTableClick();//for the click event
    mapRankTableClick(); // for the click event
    console.log("Ranking done!");
}

/*
>Variables considered in the ranking:
>>distance (distance)
>>number_units (affordability)
>>number_crimes (safety)
>>number_museums (culture)
>>number_subs (transportation)
*/

//structure of the data:
//{id_boro, id_district, rank, distance_score, affordability_score, safety_score, culture_score, transportation_score, overall_score}
//note, this id_district refers to the position it is stored in the boroughs dataframe
var districtsRank = [];

//data standarization, read http://www.statisticshowto.com/normalized/

Math.artihmeticMean = function(data){
    let sum = 0.0;
    let lenData = data.length;
    for(let i = 0 ; i <lenData;i++){
        sum+=data[i];
    }
    return sum/lenData;
}
Math.variance = function(data,mean){
    let sum = 0.0;
    let lenData = data.length;
    for(let i = 0 ; i <lenData;i++){
        sum = (data[i]-mean)*(data[i]-mean);
    }
    return (1/(lenData-1))*sum;
}

var zscore = function(data){
    let mean = Math.artihmeticMean(data);
    let desvest = Math.sqrt(Math.variance(data,mean));
    let lenData = data.length;
    for(let i = 0 ; i<lenData;i++){
        data[i] = (data[i]-mean)/desvest;//overwritte
    }
    return data;
}


function createRankDataFrame(){
    for(let i = 1;i<=5;i++){
        let lenDist = boroughs[i].districts.length;
        for (let j = 0 ; j<lenDist;j++){
            if(!boroughs[i].districts[j].habitable)continue;//discard non habitable districts;
            districtsRank.push({
                rank:0,//not yet ranked
                id_boro:i,
                id_district:j+1,
                distance_score:boroughs[i].districts[j].distance,
                affordability_score:boroughs[i].districts[j].number_units,
                safety_score:boroughs[i].districts[j].number_crimes,
                culture_score:boroughs[i].districts[j].number_museums,
                transportation_score:boroughs[i].districts[j].number_subs,
                overall_score:0 //not yet calculated
            });
        }
    }
    let zdistance = zscore(districtsRank.map(x=>x.distance_score)),
        zaffordable = zscore(districtsRank.map(x=>x.affordability_score)),
        zsafety = zscore(districtsRank.map(x=>x.safety_score)),
        zculture = zscore(districtsRank.map(x=>x.distance_score)),
        ztransport = zscore(districtsRank.map(x=>x.transportation_score));

    let lenRank = districtsRank.length;
    for(let i = 0 ;i < lenRank ; i++){
        districtsRank[i].distance_score = zdistance[i];
        districtsRank[i].affordability_score = zaffordable[i];
        districtsRank[i].safety_score = zsafety[i];
        districtsRank[i].culture_score = zculture[i];
        districtsRank[i].transportation_score = ztransport[i];
        districtsRank[i].overall_score = (-zdistance[i]) + zaffordable[i] + zsafety[i] + zculture[i] + ztransport[i];
    }
}

function rankFunction(parameter){//executed when all data is loaded
    districtsRank.sort(function(a,b){return b[parameter] - a[parameter];});
    let lenRank = districtsRank.length;
    for(let i = 0 ; i < lenRank ; i++)districtsRank[i].rank = i+1;
}

//rowMask allows me to pick the columns I want.
//rank - 1 , borough - 2, District - 4, Distance - 8, Affortability - 16, Safety - 32, Culture - 64, Transit -128, TotalScore-256
function createtable(container_id,rowMask,qt){ // component to create ranking tables in the id received, qt limits the number of rows
    let tableHeader = '<thead class = "thead-dark"><tr>'
        +((rowMask&1)?'<th scope = "col">#</th>':'')
        +((rowMask&2)?'<th scope="col">Bor</th>':'')
        +((rowMask&4)?'<th scope="col">Dic</th>':'')
        +((rowMask&8)?'<th scope = "col">D.</th>':'')
        +((rowMask&16)?'<th scope = "col">A.</th>':'')
        +((rowMask&32)?'<th scope = "col">S.</th>':'')
        +((rowMask&64)?'<th scope = "col">C.</th>':'')
        +((rowMask&128)?'<th scope = "col">T.</th>':'')
        +((rowMask&256)?'<th scope = "col">TScore</th>':'')
        +'</tr></thead>';
    $(container_id).append(tableHeader);
    $(container_id).append('<tbody></tbody>');
    let len = districtsRank.length;
    for(let i = 0 ; i <len ; i++){
        if(qt!=null && qt--<=0)break;
        $(container_id).find('tbody').append(
            '<tr class = "rowCursor">'
            +((rowMask&1)?('<th scope="row">'+districtsRank[i].rank +'</th>'):'')
            +((rowMask&2)?("<td>"+boroughs[districtsRank[i].id_boro].boro_name +"</td>"):'')
            +((rowMask&4)?("<td>"+districtsRank[i].id_district +"</td>"):'')
            +((rowMask&8)?("<td>"+districtsRank[i].distance_score.toFixed(2) +"</td>"):'')
            +((rowMask&16)?("<td>"+districtsRank[i].affordability_score.toFixed(2) +"</td>"):'')
            +((rowMask&32)?("<td>"+districtsRank[i].safety_score.toFixed(2) +"</td>"):'')
            +((rowMask&64)?("<td>"+districtsRank[i].culture_score.toFixed(2) +"</td>"):'')
            +((rowMask&128)?("<td>"+districtsRank[i].transportation_score.toFixed(2) +"</td>"):'')
            +((rowMask&256)?("<td>"+districtsRank[i].overall_score.toFixed(2) +"</td>"):'')
            +"</tr>"
        );
    }
}

function customTableCreate(dt,headers,id_table,from,to){ //creates the table you want, requires headers and data object dt
    let cols = headers.length;
    let heads = '<thead class = "thead-dark"><tr>',content ='<tbody>';
    for(let i = 0 ; i<cols;i++){
        heads +='<th scope="col">'+ headers[i] +'</th>';
    }
    heads +='</tr></thead>';
    let dataLen = dt.length;
    for(let i = from ; i<dataLen;i++){
        if(i==to)break;
        content +='<tr>'
        for(let key in dt[i]){
            if(dt[i].hasOwnProperty(key) && key!="mapsLocation"){
                content +='<td>'+ dt[i][key] +'</td>';
            }
        }
        content +='</tr>'
    }
    content+='</tbody>';
    $(id_table).append(heads).append(content);
}

function createCSV(dt,headers){
    let csv = headers.join(",")+"\n";

    let len = dt.length, cols = headers.length;
    for(let i = 0 ; i<len;i++){
        let ct = 0;
        for(let key in dt[i]){
            csv += dt[i][key]
            if(ct++!=cols-1)csv+=",";
        }
        csv+="\n";
    }

    let filename = 'export.csv', link, data;
    if (!csv.match(/^data:text\/csv/i))csv = 'data:text/csv;charset=utf-8,' + csv;
    data = encodeURI(csv);

    link = document.getElementById("download-btn");
    link.setAttribute('href', data);
    link.setAttribute('download', filename);
}

/*---------------------------- Google maps scripts and other functions ----------------- */
var mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#dadada"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c9c9c9"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
]

var mapTop;
var coordNYU = {lat: 40.729218, lng: -73.996492};

function createIcon(ico_url){
    return{
        url: ico_url,
        origin: new google.maps.Point(0,0),
        scaledSize: new google.maps.Size(40, 40), //scale
        anchor: new google.maps.Point(0, 0)
    };
}

function parser(str){
   str = str.split(" ");
   return {lat: parseFloat( str[2].slice(0,-1) ) , lng: parseFloat( str[1].slice(1) ) };
}
function latLongMaps(dat){
    return {lat:dat[1] , lng: dat[0]};
}

function inOutMapsQuery(point, polygon){ //slower
    let pun = new google.maps.LatLng(point.lat,point.lng);
    return google.maps.geometry.poly.containsLocation(pun,polygon);
}

function inOutMapsD3(point, polygon){
    if(polygon.type == "Polygon"){
        return d3.polygonContains(polygon.coordinates[0],[point.lng,point.lat]);
    }else{
        let len = polygon.coordinates.length;
        for (let i = 0 ; i < len;i++){
            if(d3.polygonContains(polygon.coordinates[i][0],[point.lng,point.lat])) return true;
        }
    }
    return false;
}


Math.radians = function(degrees){
    return degrees * Math.PI / 180;
}
var Rad = 6371e3; // earth radius
function latLngDistances(pointA,pointB){
    //based on: https://www.movable-type.co.uk/scripts/latlong.html
    let d1 = Math.radians(pointA.lat);
    let d2 = Math.radians(pointB.lat);
    let lambda = Math.radians(pointB.lng-pointA.lng);
    return Math.acos( Math.sin(d1)*Math.sin(d2) + Math.cos(d1)*Math.cos(d2) * Math.cos(lambda) ) * Rad;
}

function createPolygon(poly){
    let dt = [],pol;
    if(poly.type == "Polygon"){
        let len  = poly.coordinates[0].length;
        for(let i = 0 ; i <len;i++){
            dt.push(latLongMaps(poly.coordinates[0][i]));
        }
        pol = new google.maps.Polygon({
            paths: dt
        });

    }else{
        let len = poly.coordinates.length;
        for (let i = 0 ; i < len;i++){
            let dt2 = [],len2 = poly.coordinates[i][0].length;
            for(j = 0 ; j<len2;j++){
                dt2.push(latLongMaps(poly.coordinates[i][0][j]));
            }
            dt.push(dt2);
        }
        pol = new google.maps.Polygon({
            paths:dt
        });
    }
    return pol;
}



function onGoogleMapResponse(){
    //Extend Polygon
    //taken from https://stackoverflow.com/questions/3081021/how-to-get-the-center-of-a-polygon-in-google-maps-v3?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
    google.maps.Polygon.prototype.my_getBounds=function(){
        var bounds = new google.maps.LatLngBounds();
        this.getPath().forEach(function(element,index){bounds.extend(element)});
        return bounds;
    }

    mapTop = new google.maps.Map(document.getElementById('mapContainer'),{
        center: coordNYU,
        zoom: 10,
        gestureHandling: 'greedy', // avoid ctrl + scroll
        zoomControl: true,
        zoomControlOptions:{
            position: google.maps.ControlPosition.LEFT_BOTTOM
        },
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        styles:mapStyle
    });
    var fixedMarker = new google.maps.Marker({
        position: coordNYU,
        icon: createIcon(iconUrls.uni),
        map: mapTop,
        title: 'NYU!',
    });
    console.log("map");
}

function showBoros(id){
    let lenDist = boroughs[id].districts.length;
    for(let i = 0 ; i < lenDist;i++){
        boroughs[id].districts[i].mapsPolygon.setMap(mapTop);
    }
}
function hideBoros(id){
    let lenDist = boroughs[id].districts.length;
    for(let i = 0 ; i < lenDist;i++){
        boroughs[id].districts[i].mapsPolygon.setMap(null);
    }
}


function focusDistrict(id_boro,id_district){
    boroughs[id_boro].districts[id_district].mapsPolygon.setOptions({
        strokeColor:"#ff1f00",
        strokeOpacity: 1.0,
        strokeWeight:5
    });
    mapTop.setOptions({
        center: boroughs[id_boro].districts[id_district].borough_center,
        zoom: 13
    });
    bubbleChart("#bubbles-map-container",id_boro,id_district,true);
    boroughs[id_boro].districts[id_district].mapsPolygon.setMap(mapTop);
}
function lostFocusDistrict(id_boro,id_district){//resets default colors.
    boroughs[id_boro].districts[id_district].mapsPolygon.setOptions({
        strokeColor:"#5a5e4b",
        strokeOpacity:0.5,
        strokeWeight: 2
    });
    bubbleChart("#bubbles-map-container",id_boro,id_district,false);
}

function showHideMarkers(id_boro,id_district,active){
    let len = boroughs[id_boro].districts[id_district].housing.length
    if(active&1)
        for(let i = 0 ; i < len ; i++){boroughs[id_boro].districts[id_district].housing[i].mapsLocation.setMap(mapTop);}
    else
        for(let i = 0 ; i < len ; i++){boroughs[id_boro].districts[id_district].housing[i].mapsLocation.setMap(null);}

    len = boroughs[id_boro].districts[id_district].neighborhoods.length
    if(active&2)
        for(let i = 0 ; i < len ; i++){boroughs[id_boro].districts[id_district].neighborhoods[i].mapsLocation.setMap(mapTop);}
    else
        for(let i = 0 ; i < len ; i++){boroughs[id_boro].districts[id_district].neighborhoods[i].mapsLocation.setMap(null);}

    len = boroughs[id_boro].districts[id_district].museums.length
    if(active&4)
        for(let i = 0 ; i < len ; i++){boroughs[id_boro].districts[id_district].museums[i].mapsLocation.setMap(mapTop);}
    else
        for(let i = 0 ; i < len ; i++){boroughs[id_boro].districts[id_district].museums[i].mapsLocation.setMap(null);}
    len = boroughs[id_boro].districts[id_district].subways.length
    if(active&8)
        for(let i = 0 ; i < len ; i++){boroughs[id_boro].districts[id_district].subways[i].mapsLocation.setMap(mapTop);}
    else
        for(let i = 0 ; i < len ; i++){boroughs[id_boro].districts[id_district].subways[i].mapsLocation.setMap(null);}
}

function showAllBoroInfo(id_boro,mask_markers,opt){
    let lenDist = boroughs[id_boro].districts.length;
    for(let i = 0 ; i < lenDist;i++){
        boroughs[id_boro].districts[i].mapsPolygon.setMap((opt)?mapTop:null);
        if (opt)showHideMarkers(id_boro,i,mask_markers);
        else showHideMarkers(id_boro,i,0);
    }
}

function showHideBorosAndMarkers(mask_markers,mask_boros){ // note, this function receives a bitmask
    for(let i = 1,j=1 ; i <=16;i*=2,j++){
        showAllBoroInfo(j, mask_markers, mask_boros&i);
    }
}


/*-----------------D3 Scripts----------------------*/


function reescale(val){
    while(val>200)val/=10;
    return Math.ceil(val)+100;
}
function bubbleChart(container_id,id_boro,id_district,picked){
    $(container_id).empty();//remove svg
    if(!picked)return;
    let svg = d3.select(container_id).append('svg');
    if(!boroughs[id_boro].districts[id_district].habitable){
        svg.attr("viewBox",'0 0 '+670+' '+ 175)
            .attr("preserveAspectRatio","xMidYMid")
            .style('width', '100%');

        svg.append("rect")
            .attr("width","100%").attr("height","100%")
            .attr("fill","#d1d1d1");

        svg.append("text")
        .attr("x","50%")
        .attr("y", "50%")
        .attr("alignment-base","middle")
        .attr("text-anchor", "middle")
        .style("font-size","100px")
        .style("fill","#797979")
        .text("Non-habitable");
        return;
    }
    let format = d3.format(",d");//decimal

    let dF = jQuery.extend({},boroughs[id_boro].districts[id_district]); //dF dataFrame, clone object to avoid problems
    dF.number_units = reescale(dF.number_units);dF.number_crimes = reescale(dF.number_crimes);dF.number_museums = reescale(dF.number_museums);
    dF.number_subs = reescale(dF.number_subs);dF.distance = reescale(dF.distance);

    //here performance does not matters because we only have 5 fields :v
    let circleInfo = [];
    circleInfo.push({
        fieldName: "Units",
        r: dF.number_units / 2,
        x: dF.number_units / 2,
        col: "#a0b100",
        val:boroughs[id_boro].districts[id_district].number_units
    });
    circleInfo.push({
        fieldName: "Crimes",
        r: dF.number_crimes / 2,
        x: circleInfo[0].x + circleInfo[0].r + dF.number_crimes / 2,
        col: "#2bb100",
        val:boroughs[id_boro].districts[id_district].number_crimes
    });
    circleInfo.push({
        fieldName: "Distance",
        r: dF.distance / 2,
        x: circleInfo[1].x + circleInfo[1].r + dF.distance / 2,
        col: "#0079b1",
        val:Math.round(boroughs[id_boro].districts[id_district].distance) + " mts."
    });
    circleInfo.push({
        fieldName: "Museums",
        r: dF.number_museums / 2,
        x: circleInfo[2].x + circleInfo[2].r + dF.number_museums / 2,
        col: "#b1005d",
        val:boroughs[id_boro].districts[id_district].number_museums
    });
    circleInfo.push({
        fieldName: "Subways",
        r: dF.number_subs / 2,
        x: circleInfo[3].x + circleInfo[3].r + dF.number_subs / 2,
        col: "#b16300",
        val:boroughs[id_boro].districts[id_district].number_subs
    });

    //set svg specs and create
    let width=Math.ceil(circleInfo[4].x+circleInfo[4].r),height = 0;
    for(let i = 0 ; i <5;i++)height = Math.max(height,circleInfo[i].r*2);

    svg.attr("viewBox",'0 0 '+width+' '+ height)
        .attr("preserveAspectRatio","xMidYMid")
        .style('width', '100%');

    let node = svg.selectAll(".node")
        .data(circleInfo)
        .enter().append("g")
        .attr("class","node")
        .attr("transform",function(d){return "translate(" + d.x + "," + height/2 + ")"; });

    let circle = node.append("circle")
        .attr("r",function(d){return d.r;})
        .attr("fill",function(d){return d.col;});

    let text = node.append("text")
        .attr("x", 0)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("font","30px")
        .text(function(d){return d.val;});

}


var colorsDashboard = ["#ff0000","#ff8d00","#ffdb00","#00d619","#009fff"];
function barChart(container_id,which_bar,no_data){
    //clear div
    $(container_id).empty();
    if(no_data){
        $(container_id).append(
            '<svg viewBox="0 0 670 350" preserveAspectRatio="xMidYMid" style="width: 100%;"><rect width="100%" height="100%" fill="#d1d1d1"></rect><text x="50%" y="50%" alignment-base="middle" text-anchor="middle" style="font-size: 100px; fill: rgb(121, 121, 121);">No-data</text></svg>'
        );
        return;
    }
    //parse data into a dataFrame
    let dat = [],maxVal = 0,ct=0;
    for(let it in chosenOnes){
        let id_boro = chosenOnes[it].id_boro, id_district = chosenOnes[it].id_district+1;
        let val = boroughs[id_boro].districts[id_district-1][which_bar];
        maxVal - Math.max(maxVal,val);
        dat.push({
            boro_district: boroughs[id_boro].boro_name+ "-" +id_district,
            val:val,
            col:colorsDashboard[ct++]
        });
    }
    //build svg

    let margin = {top: 10,right:50,bottom:20,left:50};
    let width = 600 -margin.left - margin.right;
    let height = 300 -margin.top - margin.bottom;

    let svg = d3.select(container_id).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox",'0 0 '+600+' '+ 300)
        .attr("preserveAspectRatio","xMidYMid")
        .style('width', '100%')
        .append("g")
        .attr("transform","translate(" + margin.left + "," + margin.top +")");

    let x = d3.scaleBand().range([0,width]);
    let y = d3.scaleLinear().range([height,0]);

    x.domain(dat.map(function(d){return d.boro_district;}));
    y.domain([0, d3.max(dat,function(d){return d.val;})]);

    svg.append("g")
    .attr("transform","translate(0,"+ height +")")
    .call(d3.axisBottom(x));

    svg.append("g")
    .call(d3.axisLeft(y));

    svg.selectAll(".bar").data(dat).enter().append("rect")
        .attr("class","bar")
        .attr("fill",function(d){return d.col;})
        .attr("x",function(d){return x(d.boro_district); })
        .attr("y",function(d){return y(d.val); })
        .attr("width",x.bandwidth())
        .attr("height",function(d){return height-y(d.val); });

}

function ringChart(container_id,which_bar,no_data){
    //clear div
    $(container_id).empty();
    if(no_data){
        $(container_id).append(
            '<svg viewBox="0 0 670 350" preserveAspectRatio="xMidYMid" style="width: 100%;"><rect width="100%" height="100%" fill="#d1d1d1"></rect><text x="50%" y="50%" alignment-base="middle" text-anchor="middle" style="font-size: 100px; fill: rgb(121, 121, 121);">No-data</text></svg>'
        );
        return;
    }
    //parse data into a dataFrame
    let dat = [],maxVal = 0,ct=0;
    for(let it in chosenOnes){
        let id_boro = chosenOnes[it].id_boro, id_district = chosenOnes[it].id_district+1;
        let val = boroughs[id_boro].districts[id_district-1][which_bar];
        maxVal - Math.max(maxVal,val);
        dat.push({
            boro_district: boroughs[id_boro].boro_name+ "-" +id_district,
            val:Math.round(val),
            col:colorsDashboard[ct++]
        });
    }

    //graph

    let width = 400, height = 400, radius = 200;
    let svg = d3.select(container_id).append("svg")
    .attr("width",width)
    .attr("height",height)
    .attr("viewBox",'0 0 '+width+' '+ height)
    .attr("preserveAspectRatio","xMidYMid")
    .style('width', '100%')
    .append("g")
    .attr("transform","translate("+ width/2 +","+ height/2 +")");

    let arc = d3.arc().outerRadius(radius-10).innerRadius(radius-70);

    let pie = d3.pie()
        .sort(null)
        .value(function(d){return d.val;});


    let g = svg.selectAll(".arc").data(pie(dat)).enter()
        .append("g")
        .attr("class","arc");

    g.append("path")
        .attr("d",arc)
        .attr("class","bar")
        .style('fill',function(d){return d.data.col;});

    g.append("text")
        .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .text(function(d) { return (d.value==0)?'':d.value; });

}


/*-----------------Interactions ------------------*/
/*-- Buttons and other interactions -- */
/*Load and wait */
var MyVar;
function waitLoad(){
    //loadBasicInfo();
    loadData();
    myVar = setTimeout(showPage, 1500);
}

function showPage() {
  document.getElementById("load-screen").style.display = "none";
  document.getElementById("containter-whole").style.display = "block";
}

/*Padding for the navigation bar*/
$("#navigationMenu").resize(function(){
    $("navBarSpacing").height($("#navigationMenu").height()+10);
});

/*Icons*/
$(".iconHouse").attr("src",iconUrls.house);
$(".iconMuseum").attr("src",iconUrls.museum);
$(".iconNeighborhood").attr("src",iconUrls.neighborhood);
$(".iconSubs").attr("src",iconUrls.subway);
/*----Map interactions----*/

//Detect tabs change in the tabs of the map and reset form
var currentMapTab = 0;

function resetFormMap(){
    if(currentMapTab == 0){
        if(boroughChosen != 0 || districtChosen != 0){
            let notClick = true;
            if(document.getElementById('housing-enable').checked == 0 && document.getElementById('neighborhood-enable').checked ==0 && document.getElementById('museum-enable').checked==0)notClick=true;
            document.getElementById('housing-enable').checked = document.getElementById('neighborhood-enable').checked = document.getElementById('museum-enable').checked = 0;
            if(!notClick)$("#show-data-map").trigger("click");
            document.getElementById('boro-map').value = 0;
            $("#boro-map").trigger("change");
        }
    }else if(currentMapTab == 1){
        $("input:checkbox[name = borough-pick]").each(function(){this.checked=0;});
        $("input:checkbox[name = borough-pick-2]").each(function(){this.checked=0;});
        $("#show-borough").trigger("click");
        $("#show-data-explore").trigger("click");
        if(heatMapCrimeStatus==1)$("#heat-crime").trigger("click");
    }else{
        $("input:checkbox[name = data-pick-rank]").each(function(){this.checked=0;});
        if(selectedRow!=null){
            $("#show-data-map-rank").trigger("click")
            selectedRow.removeClass("rowSelectedColor");
            hideBoros(rankMapBoro);
            lostFocusDistrict(rankMapBoro,rankMapDistrict);
            showHideMarkers(rankMapBoro,rankMapDistrict,0);
            selectedRow = rankMapDistrict = rankMapBoro = null;
        }
        rankMarkers=0;
    }
}

//interaction map tabs
$("a[href='#find-tab']").on('shown.bs.tab', function(e) {resetFormMap();currentMapTab = 0;});
$("a[href='#explore-tab']").on('shown.bs.tab', function(e) {resetFormMap();currentMapTab = 1;});
$("a[href='#ranking-rab']").on('shown.bs.tab', function(e) {resetFormMap();currentMapTab = 2;});


//----- Map find tab ----
var boroughChosen = 0;
var districtChosen = 0;
var activeMarkers = 0; //bitmask
$("#boro-map").change(function(){
    if(this.value != 0){
        mapTop.setOptions({center: coordNYU,zoom: 10});//resets
        showBoros(this.value);
        if(districtChosen!=0){
            lostFocusDistrict(boroughChosen,districtChosen-1);
            showHideMarkers(boroughChosen,districtChosen-1,0);
            boroughs[boroughChosen].districts[districtChosen-1].mapsPolygon.setMap(null);
            districtChosen = 0; //resets
        }
        if(boroughChosen!=0)hideBoros(boroughChosen);
        boroughChosen=this.value;
        $("#boro-dic-map").empty();
        $("#boro-dic-map").append('<option value="0">Choose...</option>');
        let lenDist = boroughs[boroughChosen].districts.length;
        for(let i = 1 ; i <=lenDist;i++){
            $('#boro-dic-map').append('<option value="' + i + '">' + i + '</option>');
        }
        $("#boro-dic-map").prop("disabled",false);
    }else{
        hideBoros(boroughChosen);
        if(districtChosen!=0){
            lostFocusDistrict(boroughChosen,districtChosen-1);
            showHideMarkers(boroughChosen,districtChosen-1,0);
            districtChosen = 0;
        }
        boroughChosen = 0;
        $("#boro-dic-map").empty();
        $("#boro-dic-map").append('<option value="0">Choose...</option>');
        $("#boro-dic-map").prop("disabled",true);
    }
});

$("#boro-dic-map").change(function(){
    if(this.value != 0){
        if(districtChosen != 0){
            showHideMarkers(boroughChosen,districtChosen-1,0);
            lostFocusDistrict(boroughChosen,districtChosen-1);
        }
        focusDistrict(boroughChosen,this.value-1);
        showHideMarkers(boroughChosen,this.value-1,activeMarkers);
        districtChosen = this.value;
    }else{
        lostFocusDistrict(boroughChosen,districtChosen-1);
        showHideMarkers(boroughChosen,districtChosen-1,0);
        districtChosen = 0;
        mapTop.setOptions({center: coordNYU,zoom: 10});//resets
    }
});

$("#show-data-map").click(function(){
    if(districtChosen == 0){
        alert("First pick a borough and a disrict number");
        return;
    }
    activeMarkers = 0;
    $("input:checkbox[name = data-pick]:checked").each(function(){
        activeMarkers+=parseInt($(this).val());
    });
    showHideMarkers(boroughChosen,districtChosen-1,activeMarkers); // activeMarkers = 0 to hidde all
});


//----- Map explore tab ----
var activeBoros = 0; //bitmask
var activeBrMarkers = 0;
var heatMapCrimeStatus = 0;
//show boroughs
$("#show-borough").click(function(){
    activeBoros = 0;
    $("input:checkbox[name = borough-pick]:checked").each(function(){
        activeBoros+=parseInt($(this).val());
    });
    showHideBorosAndMarkers(activeBrMarkers,activeBoros);
});


//show markers
$("#show-data-explore").click(function(){
    activeBrMarkers = 0;
    $("input:checkbox[name = borough-pick-2]:checked").each(function(){
        activeBrMarkers+=parseInt($(this).val());
    });
    showHideBorosAndMarkers(activeBrMarkers,activeBoros);
});

//hetmapEnable,disable
$("#heat-crime").click(function(){
    if(heatMapCrimeStatus == 0){
        heatmapCrimeShow.setMap(mapTop);
        heatMapCrimeStatus = 1;
    }else{
        heatmapCrimeShow.setMap(null);
        heatMapCrimeStatus = 0;
    }
});

//-----Map ranking tab -----

var selectedRow;
var rankMapDistrict,rankMapBoro,rankMarkers=0;

function mapRankTableClick(){ // I create this like a function because i'll call it just after the creation of the table.
    $("#table-ranking-map > tbody > tr").click(function(){
        if(selectedRow !=null){
            selectedRow.removeClass("rowSelectedColor");
            hideBoros(rankMapBoro);
            lostFocusDistrict(rankMapBoro,rankMapDistrict);
            showHideMarkers(rankMapBoro,rankMapDistrict,0);
        }
        rankMapDistrict = $(this).find("td").eq(1).text() - 1;
        rankMapBoro = boroR[$(this).find("td").eq(0).text()];
        showBoros(rankMapBoro);
        focusDistrict(rankMapBoro,rankMapDistrict);
        showHideMarkers(rankMapBoro,rankMapDistrict,rankMarkers);
        $(this).addClass("rowSelectedColor");
        selectedRow = $(this);
    });
}

$("#show-data-map-rank").click(function(){
    if(selectedRow!=null){
        rankMarkers = 0;
        $("input:checkbox[name = data-pick-rank]:checked").each(function(){
            rankMarkers+=parseInt($(this).val());
        });
        console.log(rankMarkers);
        showHideMarkers(rankMapBoro,rankMapDistrict,rankMarkers);
    }
});

/*-----dashboard Interactions-----------*/

var chosenOnes = {},qt = 0;
var rankDashDistrict,rankDashBoro;


function dashboardTableClick(){
    $("#table-ranking-dashboard > tbody > tr").click(function(){
        rankDashDistrict = $(this).find("td").eq(1).text() - 1;
        rankDashBoro = boroR[$(this).find("td").eq(0).text()];
        keyMap = rankDashBoro*100+rankDashDistrict;
        if(keyMap in chosenOnes){
            $(this).removeClass("rowSelectedColor");
            delete chosenOnes[keyMap];
            qt--;
        }else{
            if(qt+1>5){
                alert("You can only pick up to five(5) districts");
            }else{
                $(this).addClass("rowSelectedColor");
                //chosenOnes.set(keyMap,{id_boro:rankDashBoro, id_district: rankDashDistrict});
                chosenOnes[keyMap] = {id_boro:rankDashBoro, id_district: rankDashDistrict};
                qt++;
            }
        }
        updateDashCharts();
    });
}

function updateDashCharts(){
    let no_data = qt==0;
    updateLegend("#legend-dashboard");
    barChart("#dashboard-bar-crimes","number_crimes",no_data);
    ringChart("#dashboard-distance-ring","distance",no_data);
    ringChart("#dashboard-units-ring","number_units",no_data);
    ringChart("#dashboard-museums-ring","number_museums",no_data);
    ringChart("#dashboard-subways-ring","number_subs",no_data);
}

function updateLegend(container_id){
    $(container_id).empty();
    $(container_id).append('<ul style="list-style:none;"></ul>')
    let ct = 0;
    for(let it in chosenOnes){
        let id_boro = chosenOnes[it].id_boro, id_district = chosenOnes[it].id_district+1;
        let label = boroughs[id_boro].boro_name+ "-" +id_district;
        $(container_id+" > ul").append(
            '<li class = "horizontal-li">'
                +'<div class = "color-box" style = "background-color:' + colorsDashboard[ct++] + ';"></div>'+ label
                +'</li>'
        );
    }
}


/*---Downloads Interactions-----*/

function latLngString(objLatLng){
    return "("+ objLatLng.lat + " "+objLatLng.lng +")";
}

var dt, headers;//for tables
$(".downloads-select input[type=radio]").on('change',function(){
    $("#table-downloads").empty();
    console.log(this.value);
    //here I have to change the tables values to create it, based on the query(parse dt)
    if(this.value == 1){//rank
        headers = ["rank","id_boro","id_district","distance_score","affordability_score",
        "safety_score","culture_score","transportation_score","overall_score"];
        dt = districtsRank;
    }else if(this.value == 2){//neighborhood
        headers = ["Borough","District","Location","Name"];
        dt = [];
        for(let i = 1 ; i<=5;i++){
            let lenDistro = boroughs[i].districts.length;
            for(let j = 0 ; j<lenDistro;j++){
                let lenN = boroughs[i].districts[j].neighborhoods.length;
                for(let k = 0 ; k<lenN ;k++){
                    dt.push({
                        a: boroughs[i].boro_name,
                        b: j+1,
                        c: latLngString(boroughs[i].districts[j].neighborhoods[k].location),
                        d: boroughs[i].districts[j].neighborhoods[k].name
                    });
                }
            }
        }
    }else if(this.value == 3){//housing
        headers = ["Borough","District","Location","Name","Low Income Units"];
        dt = [];
        for(let i = 1 ; i<=5;i++){
            let lenDistro = boroughs[i].districts.length;
            for(let j = 0 ; j<lenDistro;j++){
                let lenN = boroughs[i].districts[j].housing.length;
                for(let k = 0 ; k<lenN ;k++){
                    dt.push({
                        a: boroughs[i].boro_name,
                        b: j+1,
                        c: latLngString(boroughs[i].districts[j].housing[k].location),
                        d: boroughs[i].districts[j].housing[k].name,
                        e: boroughs[i].districts[j].housing[k].lowIncome
                    });
                }
            }
        }
    }else if(this.value == 4){//Crimes
        headers = ["Borough","District","Crime Description","Location","Date"];
        dt = [];
        for(let i = 1 ; i<=5;i++){
            let lenDistro = boroughs[i].districts.length;
            for(let j = 0 ; j<lenDistro;j++){
                let lenN = boroughs[i].districts[j].crimes.length;
                for(let k = 0 ; k<lenN ;k++){
                    dt.push({
                        a: boroughs[i].boro_name,
                        b: j+1,
                        c: boroughs[i].districts[j].crimes[k].description,
                        e: latLngString(boroughs[i].districts[j].crimes[k].location),
                        f: boroughs[i].districts[j].crimes[k].date,
                    });
                }
            }
        }
    }else if(this.value == 5){//museums
        headers = ["Borough","District","Name","Address","Location","Tel","URL"];
        dt = [];
        for(let i = 1 ; i<=5;i++){
            let lenDistro = boroughs[i].districts.length;
            for(let j = 0 ; j<lenDistro;j++){
                let lenN = boroughs[i].districts[j].museums.length;
                for(let k = 0 ; k<lenN ;k++){
                    dt.push({
                        a: boroughs[i].boro_name,
                        b: j+1,
                        c: boroughs[i].districts[j].museums[k].name,
                        e: boroughs[i].districts[j].museums[k].address,
                        f: latLngString(boroughs[i].districts[j].museums[k].location),
                        g: boroughs[i].districts[j].museums[k].tel,
                        h: boroughs[i].districts[j].museums[k].url
                    });
                }
            }
        }
    }else{//subway
        headers = ["Borough","District","Name","Linie","Corner","Location"];
        dt = [];
        for(let i = 1 ; i<=5;i++){
            let lenDistro = boroughs[i].districts.length;
            for(let j = 0 ; j<lenDistro;j++){
                let lenN = boroughs[i].districts[j].subways.length;
                for(let k = 0 ; k<lenN ;k++){
                    dt.push({
                        a: boroughs[i].boro_name,
                        b: j+1,
                        c: boroughs[i].districts[j].subways[k].name,
                        e: boroughs[i].districts[j].subways[k].linie,
                        f: boroughs[i].districts[j].subways[k].corner,
                        g: latLngString(boroughs[i].districts[j].subways[k].location)
                    });
                }
            }
        }
    }
    customTableCreate(dt,headers,"#table-downloads",0,100);
    createCSV(dt,headers);
});

$("#download-btn").click(function(){
    if(dt==null){
        alert("First pick a table to download");
    }
});
