/*Ranking Script*/
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
    house:"https://image.flaticon.com/icons/svg/608/608671.svg",
    museum:"https://image.flaticon.com/icons/svg/252/252032.svg",
    neighborhood:"https://image.flaticon.com/icons/svg/459/459273.svg",
    uni:"https://image.flaticon.com/icons/svg/186/186335.svg",
    subway:"https://image.flaticon.com/icons/svg/744/744537.svg"
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
                    })
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
        //for the rank, rankFunction
        rankFunction();

        //apend to tableRanks
        createtable("#table-ranking-map");
    })
}

/*----------------------------------------Scripts Ranking--------------------------------*/

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


function rankFunction(){//executed when all data is loaded
    for(let i = 1;i<=5;i++){
        let lenDist = boroughs[i].districts.length;
        for (let j = 0 ; j<lenDist;j++){
            if(!boroughs[i].districts[j].habitable)continue;//discard non habitable districts;
            districtsRank.push({
                rank:0,//not yet ranked
                id_boro:i,
                id_district:j,
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
    districtsRank.sort(function(a,b){return a.overall_score < b.overall_score;});
    for(let i = 0 ; i < lenRank ; i++)districtsRank[i].rank = i+1;
    console.log("Score and ranking done");
}

function createtable(tableId){ // component to create ranking tables in the id received
    let tableHeader = '<thead class = "thead-dark"><tr><th scope = "col">#</th><th scope="col">Bor</th><th scope="col">Dic</th><th scope = "col">D.</th><th scope = "col">A.</th><th scope = "col">S.</th><th scope = "col">Ct.</th><th scope = "col">T.</th><th scope = "col">All</th></tr></thead>'
    $(tableId).append(tableHeader);
    $(tableId).append('<tbody></tbody>');
    let len = districtsRank.length;
    for(let i = 0 ; i <len ; i++){
        $(tableId).find('tbody').append(
            "<tr>"
            +'<th scope="row">'+districtsRank[i].rank +'</th>'
            +"<th>"+boroughs[districtsRank[i].id_boro].boro_name +"</th>"
            +"<th>"+boroughs[districtsRank[i].id_boro].districts[districtsRank[i].id_district].number +"</th>"
            +"<th>"+districtsRank[i].distance_score.toFixed(2) +"</th>"
            +"<th>"+districtsRank[i].affordability_score.toFixed(2) +"</th>"
            +"<th>"+districtsRank[i].safety_score.toFixed(2) +"</th>"
            +"<th>"+districtsRank[i].culture_score.toFixed(2) +"</th>"
            +"<th>"+districtsRank[i].transportation_score.toFixed(2) +"</th>"
            +"<th>"+districtsRank[i].overall_score.toFixed(2) +"</th>"
            +"</tr>"
        );
    }
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
        scaledSize: new google.maps.Size(40, 40), //scale
        origin: new google.maps.Point(0,0),
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
    boroughs[id_boro].districts[id_district].mapsPolygon.setMap(mapTop);
}
function lostFocusDistrict(id_boro,id_district){//resets default colors.
    boroughs[id_boro].districts[id_district].mapsPolygon.setOptions({
        strokeColor:"#5a5e4b",
        strokeOpacity:0.5,
        strokeWeight: 2
    });
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


/*-----------------Interactions ------------------*/
/*-- Buttons and other interactions -- */
/*Load and wait */
$(document).ready(function(){
    for(var i = 1 ; i<=5;i++){
        $('#boro-map').append('<option value="' + i + '">' + boroughs[i].boro_name+ '</option>');
    }
});
var MyVar;
function waitLoad(){
    //loadBasicInfo();
    loadData();
    myVar = setTimeout(showPage, 1000);
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
/*Map interactions*/

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
            $('#boro-dic-map').append('<option value="' + i + '">' + boroughs[boroughChosen].districts[i-1].number+ '</option>');
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
        focusDistrict(boroughChosen,this.value-1);
        showHideMarkers(boroughChosen,this.value-1,activeMarkers);
        if(districtChosen != 0){
            showHideMarkers(boroughChosen,districtChosen-1,0);
            lostFocusDistrict(boroughChosen,districtChosen-1);
        }
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
