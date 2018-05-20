/*Ranking Script*/
/* --------------------- Load the datasets -------------------------*/

var URLS = [
    {name: "geoshapes", url:"https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson"},
    {name: "neighborhood_names", url:"https://data.cityofnewyork.us/api/views/xyye-rtrs/rows.json?accessType=DOWNLOAD"},
    {name: "housing", url:"https://data.cityofnewyork.us/api/views/hg8x-zxpr/rows.json?accessType=DOWNLOAD"},
    {name: "museums", url:"https://data.cityofnewyork.us/api/views/fn6f-htvy/rows.json?accessType=DOWNLOAD"},
    {name: "art", url:"https://data.cityofnewyork.us/api/views/43hw-uvdj/rows.json?accessType=DOWNLOAD"},
    {name: "crime", url:"https://data.cityofnewyork.us/api/views/qgea-i56i/rows.json?accessType=DOWNLOAD"}
];

var boroR = {"Manhattan":"1","Bronx":"2","Brooklyn":"3","Queens":"4","Staten Island":"5"};
var boroRCAPS = {"MANHATTAN":"1","BRONX":"2","BROOKLYN":"3","QUEENS":"4","STATEN ISLAND":"5"};

var boroughs = { // in this one we build the "dataframe"
    "1": {boro_name:"Manhattan",color: "#06e908",districts:[]},//1
    "2": {boro_name:"Bronx",color: "#134bdb",districts:[]},//2
    "3": {boro_name:"Brooklyn",color:"#d7480b",districts:[]},//3
    "4": {boro_name:"Queens",color: "#c211ee",districts:[]},//4
    "5": {boro_name:"Staten Island",color: "#dbd318",districts:[]}//5
};

//new way to handle data, it is better and more organized
var geoshapesData,neighborhoodData,housingData,museumsData,artData,crimeData;

function processGeoshapes(){
    let len = geoshapesData.length;
    for(let i = 0 ; i <len;i++){
        let boroCD = geoshapesData[i].properties.BoroCD/100.0>>0;
        let boroID = geoshapesData[i].properties.BoroCD - (boroCD*100);
        let mPol = createPolygon(geoshapesData[i].geometry)
        mPol.setOptions({
            fillColor:boroughs[boroCD].color,
            strokeColor:"#5a5e4b",
            strokeOpacity:0.5,
            strokeWeight: 2
        });
         //Template of values for each boro
        boroughs[boroCD].districts.push({
            number:boroID,
            poly: geoshapesData[i].geometry,
            mapsPolygon: mPol,//polygon
            borough_center: mPol.my_getBounds().getCenter(),
            neighborhoods: [],
            housing: [],
            museums: [],
            art: [],
            crimes: [],
            number_crimes: 0,
            number_units: 0,
            distance: 0,
            number_museums_art: 0
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
            if(inOutMapsQuery(point,boroughs[id].districts[j].mapsPolygon)){
                boroughs[id].districts[j].neighborhoods.push({
                    name:neighborhoodData[i][10],
                    location:point,
                    mapsLocation: new google.maps.Marker({
                        position:point,
                        icon:createIcon("src/neighborhood.png"),
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
            if(inOutMapsQuery(point,boroughs[id].districts[j].mapsPolygon)){
                boroughs[id].districts[j].housing.push({
                    name:housingData[i][9],
                    location:point,
                    mapsLocation: new google.maps.Marker({
                        position:point,
                        icon: createIcon("src/house.png"),
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
                if(inOutMapsQuery(point,boroughs[j].districts[k].mapsPolygon)){
                    boroughs[j].districts[k].museums.push({
                        name: museumsData[i][9],
                        location:point,
                        mapsLocation: new google.maps.Marker({
                            position:point,
                            icon: createIcon("src/museum.png"),
                            title:museumsData[i][9]
                        }),
                        address: museumsData[i][12] + " - " + museumsData[i][13],
                        tel: museumsData[i][10],
                        url: museumsData[i][11]
                    })
                }
            }
        }
        if(id == -1)continue;
    }
}

function processArt(){ // i'll put this here, but i wont use this dataset
    let lenData = artData.length;
    for(let i = 0 ; i < lenData ; i++){
        let id = -1;
        let point = parser(artData[i][9]);
        //quite greedy, but there is no way but check all districts because the data has no district info
        for(let j = 1 ; j <=5 ; j++){//boro
            let lenDist = boroughs[j].districts.length;
            for(let k = 0 ; k < lenDist ; k++){//district
                if(inOutMapsQuery(point,boroughs[j].districts[k].mapsPolygon)){
                    boroughs[j].districts[k].art.push({
                        name: artData[i][8],
                        location:point,
                        mapsLocation: new google.maps.Marker({
                            position:point,
                            icon: createIcon("src/art.png"),
                            title:artData[i][9]
                        }),
                        address: artData[i][12] + " - " + artData[i][13],
                        tel: artData[i][10],
                        url: artData[i][11]
                    })
                }
            }
        }
        if(id == -1)continue;
    }
}

var heatmapCrimeShow, pointsHeatCrimes
function processCrime(){
    let lenData = crimeData.length;
    for (let i = 0 ; i<lenData;i++){
        let id = boroRCAPS[crimeData[i].boro_nm];
        let point = {lat: parseFloat(crimeData[i].latitude), lng:parseFloat(crimeData[i].longitude)};
        let pt = new google.maps.LatLng(point.lat,point.lng);
        pointsHeatCrimes.push(pt);
        let lenDist = boroughs[id].districts.length;
        for(let j = 0 ; j <lenDist;j++){
            if(inOutMapsQuery(point,boroughs[id].districts[j].mapsPolygon)){
                boroughs[id].districts[j].crimes.push({
                    description:crimeData[i].ofns_desc,
                    date:crimeData[i].cmplnt_fr_dt,
                    location:point,
                    mapsPoint: pt
                });
                break;
            }
        }
    }
    heatmapCrimeShow = new google.maps.visualization.HeatmapLayer({
        data:pointsHeatCrimes
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
    }).done(function(data){crimeData = data;console.log("Crime loaded");})
    ).then(function(){
        processGeoshapes();
        processNeighborhoods();
        processHousing();
        processMuseums();
        //processArt();
        processCrime();

    })
}



/*---------------------------- Google maps interaction scripts ----------------- */

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
        streetViewControl: false
    });
    var fixedMarker = new google.maps.Marker({
        position: coordNYU,
        icon: createIcon("src/uni.png"),
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

    myVar = setTimeout(showPage, 100);
}

function showPage() {
  document.getElementById("load-screen").style.display = "none";
  document.getElementById("containter-whole").style.display = "block";
}

/*Map interactions*/

//Detect tabs change in the tabs of the map and reset form
var currentMapTab = 0;

function resetForm(){
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

    }else{

    }
}

$("a[href='#find-tab']").on('shown.bs.tab', function(e) {
    resetForm();
    currentMapTab = 0;
});

$("a[href='#explore-tab']").on('shown.bs.tab', function(e) {
    resetForm();
    currentMapTab = 1;
});
$("a[href='#selected-tab']").on('shown.bs.tab', function(e) {
    resetForm();
    currentMapTab = 2;
});


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

//hetmapEnable,diable
$("#heat-crime").click(function(){
    if(heatMapCrimeStatus == 0){
        heatmapCrimeShow.setMap(mapTop);
        heatMapCrimeStatus = 1;
    }else{
        heatmapCrimeShow.setMap(null);
        heatMapCrimeStatus = 0;
    }
});
/*Padding for the navigation bar*/
$("#navigationMenu").resize(function(){
    $("navBarSpacing").height($("#navigationMenu").height()+10);
});
