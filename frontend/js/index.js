window.addEventListener("load", async () => {
    const newYorkCoords = [-73.935242, 40.730610];
    const newYorkCoordsEPSG3857 = [-8230433.49, 4972687.54];

    let markerLayer = null;

    let currentMarkerFeatures = {
        "address": "34-41 21ST STREET",
        "borough": "QUEENS",
        "psa": "POLICE SERVICE AREA #9 SATELLITE",
        "zipcode": "11106",
        "start_date": "2018-10-01T00:00:00.000Z",
        "phase": "15",
        "sector": "108B",
        "sct_text": "108B",
        "sctr_float": "25",
        "sq_feet": "15811536.8268",
        "pct": "108",
        "sq_mile_new": "1.52975223847",
        "patrol_bor": "PBQN",
        "patrol_boro": "PATROL BORO QUEENS NORTH",
        "sq_miles": "0.567163111052"
    };

    toastr.options.timeOut = 10000;

    const backend_url = "http://127.0.0.1:8000/crime";

    const ageInput = document.getElementById("age");
    const sexInput = document.getElementById("sex");
    const raceInput = document.getElementById("race");
    const crimeDateInput = document.getElementById("crimeDate");
    const latCoordsInput = document.getElementById("crimeCoordsLat");
    const lonCoordsInput = document.getElementById("crimeCoordsLon");

    const ageValueContainer = document.getElementById("age_value");

    const form = document.querySelector("form");

    const detectBtn = document.getElementById("detect");
    const detectSpinner = document.getElementById("detect-spinner");

    const resetFormBtn = document.getElementById("resetForm");
    const focusOnNewYorkBtn = document.getElementById("focusOnNewYork");

    ageInput.addEventListener("input", evt => {
        ageValueContainer.textContent = `${evt.target.value} Years`
    });

    form.addEventListener("change", evt => {
        if (ageInput.value && sexInput.value && raceInput.value
            && crimeDateInput.value && latCoordsInput.value && lonCoordsInput.value) {
            detectBtn.classList.remove("disabled");
        } else {
            detectBtn.classList.add("disabled");
        }
    });

    form.addEventListener("submit", evt => {
        evt.preventDefault();
        detectBtn.classList.add("d-none");
        detectSpinner.classList.remove("d-none");
        resetFormBtn.disabled = 'disabled';
        focusOnNewYorkBtn.disabled = 'disabled';

        fetch(`${backend_url}?age=${ageInput.value}&race=${raceInput.value}&sex=${sexInput.value}&datetime=${(new Date(crimeDateInput.value)).getTime()/1000}&lat=${latCoordsInput.value}&long=${lonCoordsInput.value}&borough=${currentMarkerFeatures.borough}&patrol_borough=${currentMarkerFeatures.patrol_boro}&precinct=${currentMarkerFeatures.pct}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            toastr.success("You are likely to be a victim of a <b>" + data.crime + "</b> crime!");
        })
        .catch(err => {
            toastr.error("There was an error while detecting the crime, please try again later!");
        })
        .finally(_ => {
            detectBtn.classList.remove("d-none");
            detectSpinner.classList.add("d-none");
            resetFormBtn.disabled = '';
            focusOnNewYorkBtn.disabled = '';
        });
    });

    resetFormBtn.addEventListener("click", () => {
        form.reset();
        ageValueContainer.textContent = "13 Years";
        detectBtn.classList.add("disabled");
        setCrimeDateToNow();
        setCrimeCoordsInputs(newYorkCoords);
        addMarkerToCoords(newYorkCoordsEPSG3857);
    });

    focusOnNewYorkBtn.addEventListener("click", () => {
        focusOnNewYork();
    });

    const point = new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({
            color: "rgba(255, 0, 0, 1)",
        }),
        stroke: new ol.style.Stroke({ color: "red", width: 1 }),
    });

    const styles = {
        "Point": new ol.style.Style({
            image: point,
        }),
        "LineString": new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: "green",
                width: 1,
            }),
        }),
        "MultiLineString": new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: "green",
                width: 1,
            }),
        }),
        "MultiPoint": new ol.style.Style({
            image: point,
        }),
        "MultiPolygon": new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: "blue",
                width: 1,
            }),
            fill: new ol.style.Fill({
                color: "rgba(0, 0, 255, 0.3)",
            }),
        }),
        "Polygon": new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: "blue",
                lineDash: [4],
                width: 3,
            }),
            fill: new ol.style.Fill({
                color: "rgba(0, 0, 255, 0.1)",
            }),
        }),
        "GeometryCollection": new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: "magenta",
                width: 2,
            }),
            fill: new ol.style.Fill({
                color: "magenta",
            }),
            image: new ol.style.Circle({
                radius: 10,
                fill: null,
                stroke: new ol.style.Stroke({
                    color: "magenta",
                }),
            }),
        }),
        "Circle": new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: "red",
                width: 2,
            }),
            fill: new ol.style.Fill({
                color: "rgba(255,0,0,0.2)",
            }),
        }),
    };

    const styleFunction = function (feature) {
        return styles[feature.getGeometry().getType()];
    };

    const NYCHA_PSA_Vector_Source = new ol.source.Vector({
        url: "assets/geojson/NYCHA_PSA.geojson",
        format: new ol.format.GeoJSON()
    });

    const NYCHA_PSA_Vector_Layer = new ol.layer.Vector({
        source: NYCHA_PSA_Vector_Source,
        title: "NYCHA PSA",
        visible: true,
        style: styleFunction,
        visible: true
    });

    const NYPD_Sectors_Vector_Source = new ol.source.Vector({
        url: "assets/geojson/NYPD_Sectors.geojson",
        format: new ol.format.GeoJSON()
    });

    const NYPD_Sectors_Vector_Layer = new ol.layer.Vector({
        source: NYPD_Sectors_Vector_Source,
        title: "NYPD Sectors",
        visible: true,
        style: styleFunction,
        visible: true
    });

    const map = new ol.Map({
        target: "map",
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM(),
                title: "OpenStreetMap",
                type: "base",
                visible: true
            }),
            NYPD_Sectors_Vector_Layer,
            NYCHA_PSA_Vector_Layer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat(newYorkCoords),
            zoom: 12
        })
    });

    let layerSwitcher = new ol.control.LayerSwitcher();
    map.addControl(layerSwitcher);

    setCrimeDateToNow();
    setCrimeCoordsInputs(newYorkCoords);
    addMarkerToCoords(newYorkCoordsEPSG3857);

    map.on("singleclick", (evt) => {
        const coordinates = ol.proj.transform(evt.coordinate, "EPSG:3857", "EPSG:4326");

        const closestNychaPsaFeature = NYCHA_PSA_Vector_Source.getClosestFeatureToCoordinate(evt.coordinate).A;
        const closestNypdSectorFeature = NYPD_Sectors_Vector_Source.getClosestFeatureToCoordinate(evt.coordinate).A;

        const pixel = evt.pixel;

        let features = [];
        map.forEachFeatureAtPixel(pixel, function (feature) {
            let clean_feature = JSON.parse(JSON.stringify(feature.A));
            delete clean_feature.geometry;
            features.push(clean_feature);
        });

        let haveClickedOnPSA = false;
        let haveClickedOnSectors = false;
        let haveClickedOnPrecincts = false;

        for (let feature in features) {
            if (feature.address) {
                haveClickedOnPSA = true;
            } else if (feature.patrol_bor) {
                haveClickedOnSectors = true;
            } else {
                haveClickedOnPrecincts = true;
            }
        }

        toastr.clear();

        if (haveClickedOnPSA || haveClickedOnSectors || haveClickedOnPrecincts) {
            currentMarkerFeatures = { ...closestNychaPsaFeature, ...closestNypdSectorFeature };

            console.log(currentMarkerFeatures);

            setCrimeCoordsInputs(coordinates);
            addMarkerToCoords(evt.coordinate);
        } else {
            toastr.error("Please click within New York!");
        }
    });

    function setCrimeDateToNow() {
        crimeDateInput.value = moment().format("yyyy-MM-DDTHH:mm");
    }

    function focusOnNewYork() {
        map.getView().setCenter(ol.proj.fromLonLat(newYorkCoords));
        map.getView().setZoom(12);

        setCrimeCoordsInputs(newYorkCoords);
        addMarkerToCoords(newYorkCoordsEPSG3857);
    }

    function addMarkerToCoords(coords) {
        if (markerLayer) {
            map.removeLayer(markerLayer);
        }

        let iconGeometry = new ol.geom.Point(coords);
        let iconFeature = new ol.Feature({
            geometry: iconGeometry,
            name: "Selected Position",
            population: 4000,
            rainfall: 500
        });
        let iconStyle = new ol.style.Style({
            image: new ol.style.Icon({
                size: [256, 512],
                offset: [0, 0],
                opacity: 1,
                scale: 0.125,
                src: "assets/marker.png"
            })
        });

        iconFeature.setStyle(iconStyle);

        let vectorSource = new ol.source.Vector({
            features: [iconFeature]
        });
        markerLayer = new ol.layer.Vector({
            source: vectorSource
        });
        map.addLayer(markerLayer);
    }

    function setCrimeCoordsInputs(coords) {
        lonCoordsInput.value = coords[0];
        latCoordsInput.value = coords[1];
    }
});
