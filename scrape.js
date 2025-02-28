const axios = require("axios")
const cliProgress = require('cli-progress');
const fs = require("fs")

const maxSaved = 50 // <- A larger max saved will lead to larger load times, as well as a larger strain on the Starbucks API

//  https://www.onthemarket.com/async/search/properties/?search-type=to-rent&location-id=london&channel=commercial&exclusive-first=false&sort-field=recommended&prop-types=office

function calculateDistance(c1, c2) {
    var radlat1 = Math.PI * c1.lat / 180
    var radlat2 = Math.PI * c2.lat / 180

    var theta = c1.lon - c2.lon
    var radtheta = Math.PI * theta / 180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)

    dist = dist * 180 / Math.PI
    dist = dist * 60 * 1.1515

    return dist
}

function getAllProperties() {
    var properties = []
    return new Promise((resolve, reject) => {
        function getPropertyPage(page) {

            axios.get("https://www.onthemarket.com/async/search/properties/", {
                params: {
                    "search-type": "to-rent",
                    "location-id": "london",
                    "channel": "commercial",
                    "exclusive-first": "false",
                    "prop-types": "office",
                    page
                }
            })
                .then(r => {
                    var pagination = r.data["pagination-controls"]
                    var next = pagination.next

                    properties.push(r.data.properties.map(p => {
                        var price = undefined
                        var size = undefined
                        var size2 = undefined

                        if (p.price) {
                            price = p.price.split("|")[0].trim()
                            size = p.price.split("|")[1]

                            if (!price.includes("£")) {
                                size = price
                                price = undefined
                            }

                            if (size) {
                                size = size.trim()

                                if (size.includes("-")) {
                                    size2 = size.split("-")[0]

                                    size2 = `${size2} sq ft`
                                } else {
                                    size2 = size
                                }
                            }
                        }

                        return {
                            id: p.id,
                            location: p.location,
                            displayAddress: p["display_address"],
                            postcode: p.postcode1,
                            price,
                            priceInt: price ? Number(price.replace(/\D/g, "")) : undefined,
                            size,
                            sizeInt: size ? Number(size2.replace(/\D/g, "")) : undefined,
                            img: p["cover-image"],
                            link: p["property-link"],
                            distanceToWaterloo: calculateDistance(p.location, {lat: 51.50323702163136, lon: -0.11221141796832974}),
                            distanceToCOL: calculateDistance(p.location, {lat: 51.51459889451055, lon: -0.0817670276302623}),
                            distanceToCW: calculateDistance(p.location, {lat: 51.50333328374816, lon: -0.018679444458744837})
                        }
                    }))

                    properties = properties.flat()

                    if (next) {
                        var nextNumber = new URL(`https://www.onthemarket.com${pagination.next["next-link"]}`).searchParams.get('page')
                        getPropertyPage(nextNumber)
                    } else {
                        resolve(properties)
                    }
                })
        }


        getPropertyPage(1)
    })
}

function starbucksAtCoord(coordinates) {
    return new Promise((resolve, reject) => {
        axios.get('https://www.starbucks.co.uk/api/v2/stores/', {
            params: {
                "filter[coordinates][latitude]": coordinates.lat,
                "filter[coordinates][longitude]": coordinates.lon,
                "filter[radius]": 5
            }
        }).then(r => {
            var rewardPossible = r.data.data.filter(s => { return s.attributes.features })
            var rewardParticipating = rewardPossible.filter(s => {
                var rewards = false
                s.attributes.features.forEach(f => {
                    if (f.code == "DR") {
                        rewards = true
                    }
                })

                return rewards
            })

            rewardParticipating.forEach(s => {
                c2 = s.attributes.coordinates
                s["distanceFromCoord"] = calculateDistance(coordinates, {lat: c2.latitude, lon: c2.longitude})
            })

            rewardParticipating.sort((a,b) => {
                var distA = a.distanceFromCoord
                var distB = b.distanceFromCoord

                if (distA < distB) return -1;
                if (distA > distB) return 1;
            })

            var closest = rewardParticipating[0]

            if (!closest) {
                reject("No starbucks")
            }

            resolve({
                id: closest.id,
                storeNumber: closest.attributes.storeNumber,
                location: {lat: closest.attributes.coordinates.latitude, lon: closest.attributes.coordinates.longitude},
                name: closest.attributes.name ? closest.attributes.name : closest.attributes.address.streetAddressLine1,
                address: closest.attributes.address,
                hours: closest.attributes.openHours,
                features: closest.attributes.features,
                distance: closest.distanceFromCoord
            })
        })
    })
}

function tubeAtCoord(coordinates) {
    //&&&app_id=8268063a&app_key=14f7f5ff5d64df2e88701cef2049c804

    return new Promise((resolve, reject) => {
        axios.get('https://api-ganges.tfl.gov.uk/StopPoint', {
            params: {
                "swLat": coordinates.lat-0.25,
                "swLon": coordinates.lon-0.25,
                "neLat": coordinates.lat+0.25,
                "neLon": coordinates.lon+0.25,
                "stopTypes": "TransportInterchange,NaptanMetroStation,NaptanRailStation,NaptanBusCoachStation,NaptanFerryPort",
                "modes": "tube",
                "includeChildren": "false",
                "returnLines": "false",
                "useStopPointHierarchy": "false",
                "categories": "Direction",
                "app_id": "8268063a",
                "app_key": "14f7f5ff5d64df2e88701cef2049c804"
            }
        }).then(r => {
            var stops = r.data

            stops.forEach(s => {
                c2 = {lat: s.lat, lon: s.lon}
                s["distanceFromCoord"] = calculateDistance(coordinates, c2)
            })

            stops.sort((a,b) => {
                var distA = a.distanceFromCoord
                var distB = b.distanceFromCoord

                if (distA < distB) return -1;
                if (distA > distB) return 1;
            })

            var closest = stops[0]

            if (!closest) {
                reject("No starbucks")
            }

            resolve({
                name: closest.commonName,
                id: closest.id,
                location: {lat: closest.lat, lon: closest.lon},
                distance: closest.distanceFromCoord
            })
        })
    })
}

// tubeAtCoord({
//     lat: 51.530306861257614,
//     lon: -0.12391671702121335
// })
// .then(r => {
//         console.log(r)
//  })

// starbucksAtCoord({
//     lat: 51.530306861257614,
//     lon: -0.12391671702121335
// })
// .then(r => {
//         console.log(r)
//  })

getAllProperties()
.then(async offices => {
    offices = offices.slice(0, maxSaved);

    var i = 0

    var bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar.start(offices.length, 0);

    await offices.forEach(async (o,y) => {
        setTimeout(async () => {
            try {
                o.closestStarbucks = await starbucksAtCoord(o.location);
                o.closestTube = await tubeAtCoord(o.location);
            } catch {}
            i++
            bar.update(i)
    
            if (i == offices.length) {
                bar.stop()
                fs.writeFileSync("./officeData.json", JSON.stringify(offices, null, 4))
            }
        }, y*3)
        // console.log(o)
    })
})