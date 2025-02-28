# office-finder
Find an office in London, measured by the most important criteria - the distance to the Tube and Starbucks.

## Installation
1. Clone the repo to your local machine
2. Run `scrape.js` with `node scrape.js` to fetch current listings
    - This can fail if `maxSaved` is set too high
    - Either wait and try again, or lower the limit
    - This is due to rate limits on the Starbucks API
3. When fully complete, open the directory in the browser to see all locations on the map
    - Alternatively, find the raw data in `officeData.json`