/*
 velib.js
 La structure du fichier importé est un peu différente que celle du flux reseau !!!
 */
/*
 GLOBALES
 */
// TOUTES LES DONNEES
var datas;
// LE TABLEAU SERT A STOCKER LES NOMS POUR ENSUITE ETRE UTILISE POUR LA LISTE DE SUGGESTIONS
var tAdresses = new Array();
var tLatProches;
var tLngProches;
var latStation;
var lngStation;
var latPersonne;
var lngPersonne;

/**
 *
 * @returns {undefined}
 */
function init() {
    
    $("#pMessage").html("Veuillez patientez pendant la récupération des données!!!");
    $("#btStationsProches").attr("disabled", "disabled");

    /*
     EVENTS
     */
    $("#saisieAdresse").on("keyup", autoCompleteParAdresse);
    $("#btStationsProches").on("click", getStationsProches);
    $("#btAfficherMap").on("click", afficherMap);

    $("#listeStationsVelibParAdresse").on("change", afficherParAdresse);

    /*
     REQUETE DISTANTE POUR RECUPERER LA LISTE DES STATIONS DE PARIS ET COURONNE
     */
    var jqXHR = $.get(
            "http://opendata.paris.fr/api/records/1.0/search/?dataset=stations-velib-disponibilites-en-temps-reel&rows=1127&facet=banking&facet=bonus&facet=status&facet=contract_name",
            "json"
            ); /// $.get

    jqXHR.done(function (data) {
        console.log("DONNEES DISTANTES");
//        datas = JSON.parse(data);
        console.log(data);
        datas = data.records;

        for (var i = 0; i < datas.length; i++) {
            var adresse = datas[i].fields.address;
            tAdresses[adresse] = adresse;
        } ///

        // Tri du tableau
        tAdresses.sort();

        //
        $("#pMessage").html("Les données distantes et en temps réel sont disponibles");
    });

    jqXHR.fail(function (xhr, statut, erreur) {
        /*
         REQUETE LOCALE POUR RECUPERER LA LISTE DES STATIONS DE PARIS ET COURONNE
         */
        console.log("Erreur AJAX : " + xhr.status + "-" + xhr.statusText + " : " + statut);
        $("#lblMessage").html(xhr.status + "-" + xhr.statusText);

        console.log("DONNEES LOCALES");

        var jqXHR = $.get(
                "http://localhost/ressources/json/stations-velib-disponibilites-en-temps-reel.json",
                "json"
                ); /// $.get

        jqXHR.done(function (data) {
            //console.log(data);
            //datas = data;

            /*
             D'ABORD IL FAUT PARSER PARCE QUE CELA VIENT D'UN FICHIER
             */
            var objetJSON = JSON.parse(data);
            console.log(objetJSON);

            datas = objetJSON;
            // EN LOCAL
//            console.log(datas);
//            console.log(datas[0].fields.position[0]); // lat
//            console.log(objetJSON[0].fields.position[1]); // lng

            for (var i = 0; i < datas.length; i++) {
                var adresse = datas[i].fields.address;
                tAdresses[adresse] = adresse;
            } ///

            // Tri du tableau
            tAdresses.sort();

            //
            $("#pMessage").html("Les données locales et pas en temps réel sont disponibles !!!");
        });
    });
    
// --- GEOLOCALISATION HTML5 
    if (navigator.geolocation) {
        // --- Demande de la position 
        // --- Cette methode prend en parametre 
        // --- une fonction de callback qu'elle va appeler 
        // --- en lui fournissant le parametre position contenant les coordonnees. 
        navigator.geolocation.getCurrentPosition(obtenirLatEtLongPersonne);
    } else {
        lblMessage.innerHTML = "Votre navigateur ne gère pas la géolocalisation";
    }
} /// init

/**
 * 
 * @param {type} position
 * @returns {undefined}
 */
function obtenirLatEtLongPersonne(position) {
    /*
     EN TEST
     */
    latPersonne = position.coords.latitude;
    lngPersonne = position.coords.longitude;

} /// getCoordonneesPersonne

/**
 * 
 * @returns {undefined}
 */
function afficherParAdresse() {
    var selection = $("#listeStationsVelibParAdresse").val();
    console.log("selection : *" + selection + "*");
    rechercherParAdresse(selection);
    $("#btStationsProches").attr("disabled", false);
} /// afficherParAdresse

/**
 *
 * @param {type} item
 * @returns {undefined}
 */
function rechercherParAdresse(item) {
    var adresse;
    var lsMessage = "";
    for (var i = 0; i < datas.length; i++) {
        var adresse = datas[i].fields.address;
        if (adresse === item) {
            console.log("Trouvé");
            lsMessage += "<br>Nom : " + datas[i].fields.name;
            lsMessage += "<br>Lat : " + datas[i].fields.position[0];
            lsMessage += "<br>Lng : " + datas[i].fields.position[1];
            lsMessage += "<br>Adresse : " + datas[i].fields.address;
            lsMessage += "<br>Accroches : " + datas[i].fields.bike_stands;
            lsMessage += "<br>Vélos : " + datas[i].fields.available_bikes;
            lsMessage += "<br>Places libres : " + datas[i].fields.available_bike_stands;

            $("#lblMessage").html(lsMessage);

            $("#ithLat").val(datas[i].fields.position[0]);
            $("#ithLng").val(datas[i].fields.position[1]);
        }
    }
} /// rechercherParAdresse

/**
 *
 * @returns {undefined}
 */
function autoCompleteParAdresse() {
    /*
     vide la liste <select>
     */
    var saisieAdresse = $("#saisieAdresse").val().toUpperCase();
    if (saisieAdresse.length > 2) {
        $("#listeStationsVelibParAdresse").empty();
        // Parcours du tableau et insertion dans la liste <select>
        //for (var i = 0; i < t.length; i++) {
        for (var cle in tAdresses) {
            if (tAdresses[cle].indexOf(saisieAdresse) >= 0) {
                var opt = $("<option>");
                opt.val(cle);
                opt.html(tAdresses[cle]);
                $("#listeStationsVelibParAdresse").append(opt);
            } /// if comparable
        } /// for
    } /// if saisieNom > 2 car
} /// autoCompleteParAdresse

/**
 *
 * @returns {undefined}
 */
function getStationsProches() {

    $("#listeStationsVelibProches").empty();

    console.log("getStationsProches");

    var lat = $("#ithLat").val();
    var lng = $("#ithLng").val();

    /*
     +500m lng : 0,0063982059
     +500m lat : 0,0013215
     */

    var latMoins = parseFloat(lat) - 0.0013215;
    var latPlus = parseFloat(lat) + 0.0013215;
    var lngMoins = parseFloat(lng) - 0.0063982059;
    var lngPlus = parseFloat(lng) + 0.0063982059;

    console.log("lat Moins : " + latMoins);
    console.log("lat Plus : " + latPlus);
    console.log("lng Moins : " + lngMoins);
    console.log("lng Plus : " + lngPlus);

    var latStation = 0;
    var lngStation = 0;
    var adresseStation = "";

    console.log("Lat : " + lat);
    console.log("Lng : " + lng);

    tLatProches = new Array();
    tLngProches = new Array();

    for (var i = 0; i < datas.length; i++) {
        latStation = datas[i].fields.position[0];
        lngStation = datas[i].fields.position[1];
        if (latStation >= latMoins && latStation <= latPlus && lngStation >= lngMoins && lngStation <= lngPlus) {
            adresseStation = datas[i].fields.address;
            if (latStation != lat && lngStation != lng) {
                console.log(adresseStation);
                var opt = $("<option>");
                opt.val(adresseStation);
                opt.html(adresseStation);
                $("#listeStationsVelibProches").append(opt);

                tLatProches.push(latStation);
                tLngProches.push(lngStation);
            }
        }
    }

} /// getStationsProches

/**
 *
 * @returns {undefined}
 */
function afficherMap() {
//    var latitude = 48.848808;
//    var longitude = 2.397406;

    var latitude = $("#ithLat").val();
    var longitude = $("#ithLng").val();

    // Crée un objet coordonnées (celui de la personne)
    var coordonneesPersonne = new google.maps.LatLng(latPersonne, lngPersonne);

    // Crée un objet coordonnées (celui de la station demandée)
    var coordonneesStation = new google.maps.LatLng(latitude, longitude);

    // Les options
    var options = {
        zoom: 17,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        center: coordonneesStation
    };

    // Affiche une carte a latitude, longitude, zoom (De 1 a 20)
    //var carte = new google.maps.Map($("#divMap"), options); /// Apparemment KO
    var carte = new google.maps.Map(document.getElementById("divMap"), options);

    // Un marqueur (celui de la personne)
    var marqueurPersonne = new google.maps.Marker({
        map: carte,
        clickable: true,
        position: coordonneesPersonne,
        title: "Vous êtes ici",
        zIndex: 99
    });

    // Un marqueur (celui de la station demandée)
    // Apparaît de couleur verte sur la map
    var marqueurStation = new google.maps.Marker({
        map: carte,
        clickable: true,
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
        position: coordonneesStation,
        title: "Station demandée",
        zIndex: 99
    });

    // Les autres marqueurs (ceux des stations proche)
    // Apparaissent de couleur bleu sur la map
    for (var i = 0; i < tLatProches.length; i++) {
        var coordonneeProche = new google.maps.LatLng(tLatProches[i], tLngProches[i]);
        var marqueurStationProche = new google.maps.Marker({
            map: carte,
            clickable: true,
            position: coordonneeProche,
            title: "Stations à proximité",
            icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            zIndex: 99
        });
    }
} /// afficherMap

// --------------------
$(document).ready(init);
