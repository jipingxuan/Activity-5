var map = L.map('map').setView([39.747, -105], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// sample point feature
var geojsonFeature = {
  type: 'Feature',
  properties: {
    name: 'Coors Field',
    amenity: 'Baseball Stadium',
    popupContent: 'This is where the Rockies play!'
  },
  geometry: {
    type: 'Point',
    coordinates: [-104.99404, 39.75621]
  }
};

L.geoJSON(geojsonFeature).addTo(map);

// point styling
var myPoints = {
  type: 'FeatureCollection',
  features: [
    geojsonFeature,
    {
      type: 'Feature',
      properties: { popupContent: 'Another point' },
      geometry: { type: 'Point', coordinates: [-105.004, 39.74] }
    }
  ]
};

function onEachFeature(feature, layer) {
  if (feature.properties && feature.properties.popupContent) {
    layer.bindPopup(feature.properties.popupContent);
  }
}

L.geoJSON(myPoints, { onEachFeature: onEachFeature }).addTo(map);

// pointToLayer example
L.geoJSON(myPoints, {
  pointToLayer: function (feature, latlng) {
    return L.circleMarker(latlng, {
      radius: 6,
      weight: 1,
      fillOpacity: 0.8
    });
  },
  onEachFeature: onEachFeature
}).addTo(map);

// line example
var myLines = [{
  type: 'LineString',
  coordinates: [
    [-105.003418, 39.753838],
    [-105.000822, 39.751891],
    [-104.998204, 39.749796],
    [-104.995316, 39.747714],
    [-104.992439, 39.745589],
    [-104.98949, 39.74349]
  ]
}];

L.geoJSON(myLines).addTo(map);

// polygon + style example
var states = [{
  type: 'Feature',
  properties: { party: 'Republican' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-104.05, 48.99],
      [-97.22, 48.98],
      [-96.58, 45.94],
      [-104.03, 45.94],
      [-104.05, 48.99]
    ]]
  }
}];

function getColor(party) {
  return party === 'Republican' ? '#ff0000' : '#0000ff';
}

function style(feature) {
  return {
    fillColor: getColor(feature.properties.party),
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5
  };
}

L.geoJSON(states, { style: style }).addTo(map);