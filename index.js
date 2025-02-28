const token = "x3MScBk8lEQyHPtLC6b0CAlmUFrwqIdllSsaRLScT4Y0oem9o7l0jxQkfDagj0Nx" // <- map token

// Create Map
var map = L.map('map').setView([51.505, -0.09], 13);

// Create variable to put offices into later
var o = []

// Set custom map tiles
var Jawg_Lagoon = L.tileLayer(`https://tile.jawg.io/e391f991-0d0b-4a6b-babd-280bc6e390f7/{z}/{x}/{y}{r}.png?access-token=${token}`, {
    attribution: '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 0,
    maxZoom: 22,
    accessToken: token
}).addTo(map);

// Icons to be used later
var greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

var redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Auto close extra popups and markers
map.on('popupclose', function (e) {
    var marker = e.popup._source
    var icon = marker["_icon"]

    if (icon) {
        if (icon.classList.contains("extra")) {
            map.removeLayer(marker)
        }
    }
});

// Scroll to offices on sidebar when opened
map.on('popupopen', function (e) {
    var marker = e.popup._source
    var icon = marker["_icon"]

    if (icon) {
        var id = icon.dataset.id
        if (id) {
            var div = document.querySelector(`.office-list div[data-id='${id}']`)

            div.scrollIntoView({
                behavior: "smooth"
            })

        }
    }

});

// Handle extra popups
function popupExtra(id, type) {
    var office = o.find(e => {return e.id == id})
    var extra = office[`closest${type}`]
    console.log(extra)
    console.log(office.displayAddress)

    let marker = L.marker([extra.location.lat, extra.location.lon], { icon: type == "Starbucks" ? greenIcon : redIcon }).addTo(map);
    marker.getElement().classList.add("extra")

    if (type == "Starbucks") {
        var hoursString = ""
        var featuresString = ""

        Object.keys(extra.hours).forEach(h => {
            if (h != "open24x7") {
                let d = extra.hours[h]
                if (d.open) {
                    hoursString += `<br><b style="text-transform: capitalize">${h}</b>: ${d.openTime.slice(0, -3)}-${d.closeTime.slice(0, -3)}`
                } else {
                    hoursString += `<br><b style="text-transform: capitalize">${h}</b>: <i>CLOSED</i>`
                }

            }
        })

        extra.features.forEach(f => {
            featuresString += `<br>- ${f.name}`
        })

        marker.bindPopup(`
        <b>Starbucks</b>
        <br>
        <a href="https://www.starbucks.co.uk/store-locator/${extra.storeNumber}" target="_blank">${extra.name}</a>
        <br>
        ${extra.address.streetAddressLine1}, ${extra.address.city}
        <hr>
        <b>Hours</b>
        ${hoursString}
        <hr>
        <b>Features</b>
        ${featuresString}
        <hr>
        ${Math.ceil(extra.distance * 16.5)} minute walk from office [${Math.round(extra.distance * 100) / 100}mi]
        `).openPopup();
    } else {
        marker.bindPopup(`
        <b>Tube</b>
        <br>
        <a href="https://tfl.gov.uk/tube/stop/${extra.id}/" target="_blank">${extra.name}</a>
        <hr>
        ${Math.ceil(extra.distance * 16.5)} minute walk from office [${Math.round(extra.distance * 100) / 100}mi]
        `).openPopup();
    }
}

// Handle Sorting
function sort() {
    var type = document.querySelector("select").value
    var sorted = o.sort((a,b) => {
        if (type == "price-low") { // Price Ascending
            if (a.priceInt === undefined) return 1;
            if (b.priceInt === undefined) return -1; 
            return a.priceInt - b.priceInt; 
        } else if (type == "price-high") { // Price Descending
            if (a.priceInt === undefined) return 1;
            if (b.priceInt === undefined) return -1; 
            return b.priceInt - a.priceInt; 
        } else if (type == "size-low") { // Size Ascending
            if (a.sizeInt === undefined) return 1;
            if (b.sizeInt === undefined) return -1; 
            return a.sizeInt - b.sizeInt; 
        } else if (type == "size-high") { // Size Descending
            if (a.sizeInt === undefined) return 1;
            if (b.sizeInt === undefined) return -1; 
            return b.sizeInt - a.sizeInt; 
        } else if (type == "near-wat") { // Distance to Waterloo
            return a.distanceToWaterloo - b.distanceToWaterloo; 
        } else if (type == "near-col") { // Distance to City of London
            return a.distanceToCOL - b.distanceToCOL; 
        } else if (type == "near-cw") { // Distance to Canary Wharf
            return a.distanceToCW - b.distanceToCW; 
        } else if (type == "near-sbux") { // Distance ot nearest Starbucks
            return a.closestStarbucks.distance - b.closestStarbucks.distance; 
        } else if (type == "near-tube") { // Distance to nearest tube station
            return a.closestTube.distance - b.closestTube.distance; 
        } else if (type == "near-amenities") { // Average distance to Starbucks and tube station
            return a.closestTube.distance * a.closestStarbucks.distance - b.closestTube.distance * b.closestStarbucks.distance; 
        }
    })

    var els = Array.from(document.querySelectorAll(".office-list div")).map(e => {return {e, id:e.dataset.id}})
    document.querySelectorAll(".office-list div").forEach(e => e.remove())

    sorted.forEach(office => {
        document.querySelector(".office-list").appendChild(els.find(e => {return e.id == office.id}).e)
    })
    
}

fetch('./officeData.json')
    .then((response) => response.json())
    .then((offices) => {
        o = offices

        offices.forEach((office) => {
            let marker = L.marker([office.location.lat, office.location.lon]).addTo(map);
            
            // Add popup
            marker.bindPopup(`
                <img style="width: 100%; aspect-ratio: 16/9; border-radius: 4px;" loading="lazy" src="${office.img}"><br>
                <b><a href="https://www.onthemarket.com/${office.link}" target="_blank">${office.displayAddress}</a></b><br>
                <b>${office.price ? office.price : "Price Unavailable"} | ${office.size ? office.size : "Size Unavailable"}</b>
                <br>
                <i>Closest <a onclick="popupExtra(${office.id}, 'Starbucks')">Starbucks</a></i>: ${Math.round(office.closestStarbucks.distance * 100) / 100}mi. (${office.closestStarbucks.address.streetAddressLine1})<br>
                <i>Closest <a onclick="popupExtra(${office.id}, 'Tube')">Tube</a></i>: ${Math.round(office.closestTube.distance * 100) / 100}mi. (${office.closestTube.name})<br>
            `)

            marker.getElement().dataset.id = office.id


            // Create Div
            let div = document.createElement("div")
            div.dataset.id = office.id

            let title = document.createElement("h2")
            title.innerHTML = office.displayAddress
            div.appendChild(title)

            let priceSize = document.createElement("b")
            priceSize.innerHTML = `${office.price ? office.price : "Price Unavailable"} | ${office.size ? office.size : "Size Unavailable"}`
            div.appendChild(priceSize)

            let img = document.createElement("img")
            img.src = office.img
            img.loading = "lazy"
            div.appendChild(img)

            let buttonContainer = document.createElement("span")
            buttonContainer.classList = "buttonContainer"
            div.appendChild(buttonContainer)

            let show = document.createElement("button")
            show.innerHTML = "Show on map"
            show.onclick = () => { marker.openPopup() }
            buttonContainer.appendChild(show)

            let starbucks = document.createElement("button")
            starbucks.innerHTML = `Starbucks ${Math.round(office.closestStarbucks.distance * 100) / 100}mi`
            starbucks.onclick = () => { popupExtra(office.id, 'Starbucks') }
            buttonContainer.appendChild(starbucks)

            let tube = document.createElement("button")
            tube.innerHTML = `Tube ${Math.round(office.closestTube.distance * 100) / 100}mi`
            tube.onclick = () => { popupExtra(office.id, 'Tube') }
            buttonContainer.appendChild(tube)

            let open = document.createElement("button")
            open.innerHTML = `&#8599;`
            open.style = "margin-left: auto;"
            open.onclick = () => { window.open(`https://www.onthemarket.com/${office.link}`, '_blank') }
            buttonContainer.appendChild(open)


            document.querySelector(".office-list").appendChild(div)
        })
    });
