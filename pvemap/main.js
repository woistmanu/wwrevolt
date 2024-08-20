import L from "leaflet";
import terrBounds from "./territory_bounds";
import terrMeta from "./territory_meta";
import factions from "./factions";
import monumentData from "./monuments";
import assetMap from "../assets/map_compressed.png";
import assetMonumentIcon from "../assets/monuments/monument-icon.png";
import { loadCities } from './city_data';  // Importiere die loadCities Funktion

// Initialisiere die Karte
let theMap = L.map("map", {
  attributionControl: false,
  center: [1024, 1024],
  crs: L.CRS.Simple,
  inertia: true,
  maxBoundsViscosity: 1,
  maxZoom: 1,
  minZoom: -1.5,
  renderer: L.svg({ padding: 1 }),
  zoom: -0.5,
  zoomDelta: 0.5,
  zoomSnap: 0.5,
});

// Mausposition anzeigen (zum Debuggen)
// theMap.addEventListener("mousemove", (event) => {
//   let lat = Math.round(event.latlng.lat * 100000) / 100000;
//   let lng = Math.round(event.latlng.lng * 100000) / 100000;
//   console.log(lat, lng);
// });

let attribution = L.control
  .attribution({ prefix: "Map Image &copy; world wide revolt" })
  .addTo(theMap);
attribution.addAttribution(
  '<a href="https://woistmanu.eu" target="_blank">woistmanu</a>'
);

// Kartenbegrenzungen und -bild
let bounds = [
  [0, 0],
  [2048, 2048],
];
theMap.setMaxBounds(bounds);
let mapImage = L.imageOverlay(assetMap, bounds).addTo(theMap);

// Farbvorgaben und Zustände
const PAINTER_COLOR_UNCLAIMED = "#AAA";
let painterColor = PAINTER_COLOR_UNCLAIMED;
let painterEnabled = false;

// Interaktivität für Layer
L.Layer.prototype.setInteractive = function (interactive) {
  if (this.getLayers) {
    this.getLayers().forEach((layer) => {
      layer.setInteractive(interactive);
    });
    return;
  }
  if (!this._path) {
    return;
  }
  this.options.interactive = interactive;
  if (interactive) {
    L.DomUtil.addClass(this._path, "leaflet-interactive");
  } else {
    L.DomUtil.removeClass(this._path, "leaflet-interactive");
  }
};

// Overlays für Territorien, Hauptstädte und Monumente
let overlayTerritory = L.featureGroup()
  .on("click", (e) => paintTerritory(e.sourceTarget, painterColor))
  .addTo(theMap);
let overlayCapitols = L.layerGroup().addTo(theMap);
let overlayMonuments = L.featureGroup().addTo(theMap);

let baseMaps = { "The Map": mapImage };
let overlayMaps = {
  "Territory Bounds": overlayTerritory,
  "Capitol Markers": overlayCapitols,
  "Monuments": overlayMonuments,
};

// Custom Layer Control für den Painter
L.Control.Layers.Custom = L.Control.Layers.extend({
  _initLayout: function () {
    L.Control.Layers.prototype._initLayout.call(this);
    L.DomUtil.create("div", "leaflet-control-layers-separator", this._section);
    let painterDiv = document.querySelector("territory-bounds-painter");
    let painterDivSection = document.querySelector(
      "territory-bounds-painter > section"
    );
    let painterCheckbox = document.querySelector("#painter-checkbox");
    painterCheckbox.addEventListener("change", (e) => {
      painterEnabled = e.target.checked;
      overlayTerritory.setInteractive(painterEnabled);
      painterDivSection.classList.toggle("hidden");
    });
    let painterPaints = document.querySelector("paints");
    painterPaints.addEventListener("change", (e) => {
      if (e.target.value == "unclaimed")
        return (painterColor = PAINTER_COLOR_UNCLAIMED);
      painterColor = factions[e.target.value].color;
    });

    // Painter-Paints-Optionen generieren
    let toAddToInnerHtml = "";
    toAddToInnerHtml += `<label><input type="radio" class="leaflet-control-layers-selector" name="painter-radio" value="unclaimed" checked> Unclaimed</label>`;
    for (let faction in factions) {
      toAddToInnerHtml += `<label><input type="radio" class="leaflet-control-layers-selector" name="painter-radio" value="${faction}"> ${factions[faction].name}</label>`;
    }
    painterPaints.innerHTML = toAddToInnerHtml;

    // Buttons für den Painter
    let painterReset = document.querySelector("#painter-reset");
    painterReset.addEventListener("click", resetAllTerritoriesPaint);

    let painterPaintAll = document.querySelector("#paint-all");
    painterPaintAll.addEventListener("click", () => {
      paintAllTerritories(painterColor);
    });

    let painterRandomizeAll = document.querySelector("#randomize-all");
    painterRandomizeAll.addEventListener(
      "click",
      paintAllTerritoriesRandomized
    );

    // Maler-Div in den Layer-Control verschieben
    this._section.appendChild(painterDiv);
  },
});

let layerControl = new L.Control.Layers.Custom(baseMaps, overlayMaps, {
  collapsed: true,
  hideSingleBase: true,
}).addTo(theMap);

// Territorien importieren und initialisieren
let refTerritories = {};
terrBounds.forEach((territory) => {
  let name = territory[0];
  let ref = L.polygon(territory[1], {
    color: PAINTER_COLOR_UNCLAIMED,
    weight: 1,
    interactive: painterEnabled,
  }).addTo(overlayTerritory);
  refTerritories[name] = ref;
});

// Hauptstädte laden und Marker setzen
loadCities(theMap, overlayCapitols);

// Monumente laden und Marker setzen
let monumentIcon = L.icon({
  iconUrl: assetMonumentIcon,
  iconSize: [64, 64],
  iconAnchor: [32, 32],
  popupAnchor: [0, -16],
});
monumentData.forEach((monument) => {
  createMonumentMarker(monument);
});

// Ursprüngliche Fraktionsgebiete bemalen
function paintFactionBaseTerritories() {
  let angelanTerritories = [
    "kinforth",
    "tamblair",
    "oaxley",
    "utentana",
    "cusichaca",
    "hongshiCoast",
    "hanat",
    "qinqaachi",
    "ulavaar",
  ];
  angelanTerritories.forEach((territory) => {
    paintTerritory(refTerritories[territory], factions.anglea.color);
  });
  let baronTerritories = [
    "lordsLeap",
    "anvala",
    "urhal",
    "northlake",
    "glowwater",
    "skyend",
    "ravenrock",
    "blackcliff",
    "serpentsPoint",
  ];
  baronTerritories.forEach((territory) => {
    paintTerritory(refTerritories[territory], factions.baron.color);
  });
  let chaladonTerritories = [
    "averna",
    "itonia",
    "anthos",
    "lascus",
    "allonia",
    "lutessa",
    "ballast",
    "beldusios",
    "lirodunum",
  ];
  chaladonTerritories.forEach((territory) => {
    paintTerritory(refTerritories[territory], factions.chaladon.color);
  });
  let merchantTerritories = [
    "vyshtorg",
    "troydon",
    "sabakumura",
    "orlevsela",
    "selogorod",
    "starostrog",
    "vamaRea",
    "morMare",
    "andelata",
  ];
  merchantTerritories.forEach((territory) => {
    paintTerritory(refTerritories[territory], factions.merchant.color);
  });
  let arashiTerritories = [
    "alleron",
    "flyaway",
    "sabbia",
    "canon",
    "naufrage",
    "faron",
    "landmark",
    "caldera",
    "kire",
  ];
  arashiTerritories.forEach((territory) => {
    paintTerritory(refTerritories[territory], factions.arashi.color);
  });
  let yeshaTerritories = [
    "changning",
    "jingshan",
    "qinjuru",
    "wuTower",
    "sanctuary",
    "yaoLingPass",
    "luTower",
    "baiHuaHills",
    "dragontown",
  ];
  yeshaTerritories.forEach((territory) => {
    paintTerritory(refTerritories[territory], factions.yesha.color);
  });
}

// Funktionen zum Malen der Territorien
function resetAllTerritoriesPaint() {
  paintAllTerritories(PAINTER_COLOR_UNCLAIMED);
  paintFactionBaseTerritories();
}

function paintTerritory(ref, color = PAINTER_COLOR_UNCLAIMED) {
  ref.setStyle({ color: color });
}

function paintAllTerritories(color = PAINTER_COLOR_UNCLAIMED) {
  for (let territory in refTerritories) {
    paintTerritory(refTerritories[territory], color);
  }
}

function paintAllTerritoriesRandomized() {
  let colors = [];
  for (let faction in factions) {
    colors.push(factions[faction].color);
  }
  for (let territory in refTerritories) {
    let randomColor = colors[Math.floor(Math.random() * colors.length)];
    paintTerritory(refTerritories[territory], randomColor);
  }
}

// Monument Marker erstellen
function createMonumentMarker(monumentData) {
  return L.marker(monumentData.position, { icon: monumentIcon })
    .bindPopup(`<img src="${monumentData.imageUrl}"/>${monumentData.text}`, {
      className: "monument-image",
    })
    .addTo(overlayMonuments);
}

// Initialisiere die Fraktionsgebiete
paintFactionBaseTerritories();

// Load cities and attach mission start logic
loadCities(theMap, overlayCapitols);

// Funktion zur Flash-Nachricht
function showFlashMessage(message) {
  const flashMessageDiv = document.createElement('div');
  flashMessageDiv.className = 'flash-message';
  flashMessageDiv.textContent = message;
  document.body.appendChild(flashMessageDiv);

  setTimeout(() => {
    flashMessageDiv.classList.add('visible');
  }, 100);

  setTimeout(() => {
    flashMessageDiv.classList.remove('visible');
    setTimeout(() => {
      flashMessageDiv.remove();
    }, 500);
  }, 3000);
}

// Funktion zur Missionsauslösung bei Klick auf eine Stadt
overlayCapitols.on('click', function (event) {
  const clickedCity = event.layer;
  if (clickedCity && clickedCity.options.cityName) {
    const cityName = clickedCity.options.cityName;

    // Hier kannst du deinen Missionsbeschreibungs-Text anzeigen lassen
    showFlashMessage(`Starte die Mission in ${cityName}?`);

    // PHP Datei aufrufen, um Mission zu starten
    fetch(`start_mission.php?city=${cityName}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          showFlashMessage(`Mission in ${cityName} gestartet!`);
        } else {
          showFlashMessage(`Fehler beim Starten der Mission in ${cityName}.`);
        }
      })
      .catch(error => console.error('Error:', error));
  }
});
