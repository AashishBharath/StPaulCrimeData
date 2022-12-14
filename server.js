// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');
let public_dir = path.join(__dirname, 'public');


let db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

let app = express();
let port = 8000;
let cors = require('cors');
// ...
app.use(cors());
app.use(express.static(public_dir));
app.use(express.json());

// Open SQLite3 database (in read-only mode)s
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});


//EXAMPLE query
//SELECT * FROM incidents WHERE date(date_time) >= '2022-05-29' AND code = 600 ORDER BY date_time DESC;
//Selects all incidents for dates past 5/29/2022 with code 600 in descending order.

// GET request handler for crime codes
app.get('/codes', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    var requested_data;
    if(Object.entries(req.query).length === 0){
        db.all('SELECT * FROM Codes', (err, rows) => {
            console.log("Data Received.")
            requested_data = rows;
            res.status(200).type('json').send(requested_data);
        });

    }else{
        if(Object.entries(req.query).length !== 0)  {
            //console.log(req.query);
            let split_codes = req.query['code'].split(',');
            //console.log(split_codes);
            var additional_queries = 'code = ';
            for(let i = 0;i<split_codes.length;i++){
                if(i===0){
                    additional_queries += split_codes[i];
                }
                else{
                    if(i==split_codes.length){
                        additional_queries += ' code = ' + split_codes[i];
                    }
                    else{
                        additional_queries += ' OR code = ' + split_codes[i];
                    }
                }
            }
            let main_query = 'SELECT * FROM Codes WHERE ' + additional_queries;
            db.all(main_query, (err, rows) => {
                if(err){
                    console.log('Error');
                }
                else{
                    console.log("Data Received");
                    //requested_data = rows;
                    res.status(200).type('json').send(rows);
                }
            });

        }
    }
    //res.status(200).type('json').send(requested_data);
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    if(Object.entries(req.query).length === 0){
        db.all('SELECT * FROM Neighborhoods ORDER BY neighborhood_number', (err, rows) => {
            res.status(200).type('json').send(rows);
        });
    }
    else{
        if(Object.entries(req.query).length !== 0)  {
            //console.log(req.query);
            let split_ids = req.query['id'].split(',');
            //console.log(split_codes);
            var additional_queries = 'neighborhood_number = ';
            for(let i = 0;i<split_ids.length;i++){
                if(i===0){
                    additional_queries += split_ids[i];
                }
                else{
                    if(i==split_ids.length){
                        additional_queries += ' neighborhood_number = ' + split_ids[i];
                    }
                    else{
                        additional_queries += ' OR neighborhood_number = ' + split_ids[i];
                    }
                }
            }
            let main_query = 'SELECT * FROM Neighborhoods WHERE ' + additional_queries;
            console.log(main_query);
            db.all(main_query, (err, rows) => {
                if(err){
                    console.log('Error');
                }
                else{
                    //console.log(rows);
                    res.status(200).type('json').send(rows);
                }
            });

        }
        //res.status(200).type('json').send({}); // <-- you will need to change this
    }
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    if(Object.entries(req.query).length === 0){
        db.all('SELECT * FROM Incidents ORDER BY date_time DESC LIMIT 1000', (err, rows) => {
            //rows = rows.slice(0,1000);

            for(let i = 0;i<rows.length;i++){
                let dateTime = rows[i]['date_time'];
                dateTime = dateTime.split("T");
                delete rows[i]["date_time"];
                rows[i]["date"] = dateTime[0];
                rows[i]["time"] = dateTime[1];
            }

            res.status(200).type('json').send(rows);
        });
    }
    else{
        // query: SELECT * FROM Incidents WHERE date(date_time) >= "2022-05-31" ORDER BY date_time DESC;
        let query = 'SELECT * FROM Incidents ';
        let clause = 'WHERE';

        if (req.query.hasOwnProperty('start_date')) {
            let start_date = req.query.start_date;
            query += clause + ' date(date_time) >=' + " \"" + start_date + "\" ";
            clause = 'AND';
        }

        if (req.query.hasOwnProperty('end_date')) {
            let end_date = req.query.end_date;
            query += clause + ' date(date_time) <=' + " \"" + end_date + "\" ";
            clause = 'AND';
        }

        if (req.query.hasOwnProperty('start_time')) {
            let start_time = req.query.start_time;
            query += clause + ' time(date_time) >=' + " \"" + start_time + "\" ";
            clause = 'AND';
        }

        if (req.query.hasOwnProperty('end_time')) {
            let end_time = req.query.end_time;
            query += clause + ' time(date_time) <=' + " \"" + end_time + "\" ";
            clause = 'AND';
        }

        if (req.query.hasOwnProperty('code')) {
            let codes = req.query.code.split(',');
            query += clause + ' ( ' + 'code = ' + codes[0] + ' ';
            for (let i=1; i<codes.length; i++) {
                clause = 'OR';
                query += clause + ' code = ' + codes[i] + ' ';
            }
            query += ') ';
            clause = 'AND';
        }

        if (req.query.hasOwnProperty('grid')) {
            let grid = req.query.grid.split(',');
            query += clause + ' ( ' + 'police_grid = ' + grid[0] + ' ';
            for (let i=1; i<grid.length; i++) {
                clause = 'OR';
                query += clause + ' police_grid = ' + grid[i] + ' ';
            }
            query += ') ';
            clause = 'AND';
        }

        if (req.query.hasOwnProperty('neighborhood')) {
            let neighborhoods = req.query.neighborhood.split(',');
            query += clause + ' ( ' + 'neighborhood_number = ' + neighborhoods[0] + ' ';
            for (let i=1; i<neighborhoods.length; i++) {
                clause = 'OR';
                query += clause + ' neighborhood_number = ' + neighborhoods[i] + ' ';
            }
            query += ') ';
            clause = 'AND';
        }

        query += 'ORDER BY date_time DESC';

        if (req.query.hasOwnProperty('limit')) {
            let limit = req.query.limit;
            query += ' LIMIT ' + limit;
        }
        else{
            query += ' LIMIT 1000'
        }

        //query += ';';

        console.log(query);

        db.all(query, (err, rows) => {
            if(err){
                console.log('Error retrieving data');
            }
            else{
                for(let i = 0;i<rows.length;i++){
                    let dateTime = rows[i]['date_time'];
                    dateTime = dateTime.split("T");
                    delete rows[i]["date_time"];
                    rows[i]["date"] = dateTime[0];
                    rows[i]["time"] = dateTime[1];
                }

                res.status(200).type('json').send(rows);
            }
        });
    }
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log("PUT /new-incident");
    console.log(req.body); // uploaded data

    // case_number, date, time, code, incident, police_grid, neighborhood_number, block
    let case_number = req.body.case_number;
    let date_time = req.body.date + 'T' + req.body.time;
    let code = req.body.code;
    let incident = req.body.incident;
    let police_grid = req.body.police_grid;
    let neighborhood_number = req.body.neighborhood_number;
    let block = req.body.block;

    if (case_number == undefined || req.body.date == undefined || req.body.time == undefined || code == undefined || incident == undefined || police_grid == undefined || neighborhood_number == undefined || block == undefined) {
        res.status(500).type('txt').send('Error: Missing data fields');
    } else {
        let params = [];
        params.push(case_number);
        params.push(date_time);
        params.push(code);
        params.push(incident);
        params.push(police_grid);
        params.push(neighborhood_number);
        params.push(block);

        // query "insert into Incidents values (?, ?, ?, ?, ?, ?, ?);"
        // INSERT INTO Incidents values (123, "2022-11-19", 600, "theft incident", 153, 15, "Summit");
        let query = "INSERT INTO Incidents values (?, ?, ?, ?, ?, ?, ?);";

        db.all(query, params, (err, rows) => {
            if (err == "Error: SQLITE_CONSTRAINT: UNIQUE constraint failed: Incidents.case_number") {
                res.status(500).type('txt').send('Error 500: Case number already exists in the database. Please try again and choose a unique case number.');
            } else if (err) {
                res.status(500).type('txt').send('Error 500: Something went wrong');
            } else {
                res.status(200).type('txt').send('Submit new incident successfully');
            }
        })
    }
});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {

    let case_number = req.body.case_number;

    let query = "SELECT * FROM Incidents where case_number = " + case_number;
    let params = [];

    db.all(query, params, (err, rows) => {
        if (rows.length == 0) {
            res.status(500).type('txt').send('Error 500: Case number does not exist in the database');
        } else {
            query = "DELETE FROM Incidents where case_number = " + case_number;
            db.all(query, params, (err, rows) => {
                if(err) {
                    res.status(500).type('txt').send('Delete FAILED');
                } else {
                    res.status(200).type('txt').send('Delete OK');
                }
            })

        }
    })
});


// Create Promise for SQLite3 database SELECT query
function databaseSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        })
    })
}

// Create Promise for SQLite3 database INSERT or DELETE query
function databaseRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    })
}


// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
