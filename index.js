const fs = require('fs');
const express = require('express');
const mysql = require('mysql');
const bodyparser = require('body-parser');
const { req, res, response } = require('express');
const path = require('path');
const session = require('express-session');
const JSON = require('express-json');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.set('internal', path.join(__dirname, '/views/internal'), {
  extentions: ['ejs'],
});
app.set('customer', path.join(__dirname, '/views/customer'), {
  extentions: ['htm', 'html'],
});
app.set('data', path.join(__dirname, '/views/data'), { extentions: ['json'] });
app.set('media', path.join(__dirname, '/views/media'), {
  extentions: ['jpg', 'gif', 'png'],
});
app.set('scripts', path.join(__dirname, '/views/scripts'), {
  extentions: ['js'],
});
app.set('styles', path.join(__dirname, '/views/styles'), {
  extentions: ['css'],
});

app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
  })
);
app.use(express.json());
app.use((request, response, next) => {
  response.set('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.static('views'));
app.use(bodyparser.urlencoded({ extended: true }));

app.listen(8000, (err) => {
  if (err) throw err;
  console.log('server is listening on port 8000');
});

//function to start connection with database
function startDBConnection() {
  let connection0 = mysql.createConnection({
    host: 'localhost',
    user: 'kyle',
    password: 'admin',
    database: 'travelexperts',
  });
  return connection0;
}

//function to generate a timestamped userId
function genId() {
  let id = '';
  for (let i = 0; i < 11; i++) {
    id += Math.floor(Math.random() * 9);
  }
  return id;
}

//customer views and route handlers

//dedault route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/customer/main.html'), (err) => {
    if (err) throw err;
  });
});

//about page route
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/customer/about.html'), (err) => {
    if (err) throw err;
  });
});

//contact page route
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/customer/contact.html'), (err) => {
    if (err) throw err;
  });
});

//vacation packages route handler customer view
app.get('/vacationPackages', (req, res) => {
  res.sendFile(
    path.join(__dirname, '/views/customer/vacationPackagesView.html'),
    (err) => {
      if (err) throw err;
    }
  );
});

//proRegister route hander customer view
app.get('/register', (req, res) => {
  res.sendFile(
    path.join(__dirname, '/views/customer/proRegister.html'),
    (err) => {
      if (err) throw err;
    }
  );
});

//registerSuccess route handler
app.get('/registerSuccess', (req, res) => {
  res.sendFile(
    path.join(__dirname, '/views/customer/registerSuccess.html'),
    (err) => {
      if (err) throw err;
    }
  );
});

//main page handler
app.get('/main', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/customer/main.html'), (err) => {
    if (err) throw err;
  });
});

//login page route
app.get('/customerLogin', (req, res) => {
  res.sendFile(
    path.join(__dirname, '/views/customer/customerLogin.html'),
    (err) => {
      if (err) throw err;
    }
  );
});
var _sessInfo;
// http://localhost:3000/customer_auth
app.post('/customer_auth', function (request, response) {
  let connection = startDBConnection();
  let email = request.body.email;
  let password = request.body.password;
  // Ensure the input fields exists and are not empty
  if (email && password) {
    // Execute SQL query that'll select the account from the database based on the specified email and password
    connection.query(
      'SELECT * FROM customers WHERE CustEmail = ? AND CustPassword = ?',
      [email, password],
      function (error, result, fields) {
        if (error) throw error;
        // If the account exists
        if (result.length > 0) {
          // Authenticate the user
          request.session.loggedin = true;
          request.session.email = email;
          request.session.fname = result[0].CustFirstName;
          request.session.cart = [];
          //pass session info
          _sessInfo = request.session;
          // Redirect to home page
          console.log(request.session);
          response.redirect('/');
        } else {
          response.send('Incorrect email and/or Password!');
        }
        response.end();
      }
    );
  } else {
    response.send('Please enter email and Password!');
    response.end();
  }
});

app.get('/getSessInfo', (req, res) => {
  res.json(_sessInfo);
});

//customer reg form route
app.post('/registerCustomer', (req, res) => {
  let connection = startDBConnection();
  let _userId = genId();
  let _fname = req.body.fname;
  let _lname = req.body.lname;
  let _address = req.body.address;
  let _city = req.body.city;
  let _prov = req.body.prov;
  let _postal = req.body.postCode;
  let _country = req.body.country;
  let _phonenumber = req.body.phone;
  let _busno = req.body.busNumber;
  let _email = req.body.email;
  let _password = req.body.retypePass;
  connection.connect((err) => {
    if (err) throw err;
    let sqlUpd =
      'INSERT INTO customers (CustomerId, CustFirstName, CustLastName, CustAddress, CustCity, CustProv, CustPostal, CustCountry, CustHomePhone, CustBusPhone, CustEmail, CustPassword) VALUES (' +
      _userId +
      ', "' +
      _fname +
      '", "' +
      _lname +
      '", "' +
      _address +
      '", "' +
      _city +
      '", "' +
      _prov +
      '", "' +
      _postal +
      '", "' +
      _country +
      '", "' +
      _phonenumber +
      '", "' +
      _busno +
      '", "' +
      _email +
      '", "' +
      _password +
      '")';
    connection.query(sqlUpd, (err, result, fields) => {
      if (err) throw err;
      console.log('customer updated');
      connection.end();
    });
  });
});

//internal client views and handlers

//create json object of vacation packages query result for publishing to web. Contains hardcoded default value for query string
//that excludes certain fields. This can be changed to one that can be defined by the client-user through a webUI.
app.post('/publishProducts', (req, res) => {
  let connection0 = startDBConnection();
  connection0.connect((err) => {
    if (err) throw err;
    let query =
      'SELECT PkgName, PkgStartDate, PkgEndDate, PkgDesc, PkgDesc FROM packages';
    connection0.query(query, (err, result, fields) => {
      if (err) throw err;
      console.log(result);
      fs.writeFile('./data/products.json', JSON.stringify(result), (err) => {
        if (err) throw err;
        console.log('file saved');
      });
    });
  });
  res.redirect('/productsView');
});

app.post('/publishContactList', (req, res) => {
  let connection0 = startDBConnection();
  connection0.connect((err) => {
    if (err) throw err;
    let query =
      'SELECT AgtFirstName, AgtLastName, AgtBusPhone, AgtEmail, AgtPosition FROM agents';
    connection0.query(query, (err, result, fields) => {
      if (err) throw err;
      console.log(result);
      fs.writeFile(
        './data/contactsList.json',
        JSON.stringify(result),
        (err) => {
          if (err) throw err;
          console.log('file saved');
        }
      );
    });
  });
  res.redirect('/getallagents');
});

//product view route handler client view
app.get('/productsView', (req, res) => {
  let myConnection = startDBConnection();
  myConnection.connect((err) => {
    if (err) throw err;
    myConnection.query('SELECT * FROM packages', (err, result, fields) => {
      if (err) throw err;
      res.render('internal/productsView', { result: result, fields: fields });
      myConnection.end((err) => {
        if (err) throw err;
      });
    });
  });
});

app.get('/getallagents', (req, res) => {
  let myConnection = startDBConnection();
  myConnection.connect((err) => {
    if (err) throw err;
    myConnection.query('SELECT * FROM agents', (err, result, fields) => {
      if (err) throw err;
      res.render('internal/allAgents', { result: result, fields: fields });
      myConnection.end((err) => {
        if (err) throw err;
      });
    });
  });
});

app.get('/agentselect', (req, res) => {
  let myConnection = startDBConnection();
  myConnection.connect((err) => {
    if (err) throw err;
    let sql = 'SELECT AgentId, AgtFirstName, AgtLastName FROM agents';
    myConnection.query(sql, (err, result, fields) => {
      if (err) throw err;
      res.render('internal/agentSelectPage', {
        result: result,
        fields: fields,
      });
      myConnection.end();
    });
  });
});

var passAgentId = null;

app.post('/getoneagent', (req, res) => {
  let myConnection = startDBConnection();
  let _agentid = req.body.AgentId;
  myConnection.connect((err) => {
    if (err) throw err;
    let sql = 'SELECT * FROM agents WHERE AgentId=?';
    myConnection.query(
      { 'sql': sql, 'values': [_agentid] },
      (err, result, fields) => {
        if (err) throw err;
        console.log('result:', result);
        res.render('internal/agentView', { result: result, fields: fields });
        myConnection.end((err) => {
          if (err) throw err;
        });
      }
    );
  });
  passAgentId = _agentid;
});

app.post('/updateAgent', (req, res) => {
  let myConnection = startDBConnection();
  let _agentid = passAgentId;
  let _AgtFirstName = req.body.AgtFirstName;
  let _AgtLastName = req.body.AgtLastName;
  let _AgtBusPhone = req.body.AgtBusPhone;
  let _AgtEmail = req.body.AgtEmail;
  let _AgtPosition = req.body.AgtPosition;
  let _AgencyId = req.body.AgencyId;
  myConnection.connect((err) => {
    if (err) throw err;
    console.log(_agentid);
    console.log(_AgtFirstName);

    let sqlUpd =
      'UPDATE agents SET AgtFirstName =?, AgtLastName =?, AgtBusPhone =?, AgtEmail =?, AgtPosition =?, AgencyId=? WHERE AgentId =' +
      _agentid;
    myConnection.query(
      {
        'sql': sqlUpd,
        'values': [
          _AgtFirstName,
          _AgtLastName,
          _AgtBusPhone,
          _AgtEmail,
          _AgtPosition,
          _AgencyId,
        ],
      },
      (err, result, fields) => {
        if (err) throw err;
        console.log('agent updated');
        myConnection.end();
      }
    );
  });
  res.redirect('/agentselect');
});

app.get('/customQuery', (req, res) => {
  res.render('internal/customQuery');
});

app.post('/queryResponse', (req, res) => {
  let connection = startDBConnection();
  let query = String(req.body.query);
  connection.connect((err) => {
    if (err) throw err;
    connection.query(query, (err, result, fields) => {
      if (err) throw err;
      console.log('fields:' + fields + 'result:' + result);
      res.render('internal/queryResponse', { result: result, fields: fields });
    });
  });
});

// let formDataObj = {
//   _email: {
//     CustomerId: _userId,
//     CustFirstName: _fname,
//     CustLastName: _lname,
//     CustAddress: _address,
//     CustCity: _city,
//     CustProv: _prov,
//     CustPostal: _postal,
//     CustCountry: _country,
//     CustHomePhone: _phonenumber,
//     CustBusPhone: _busno,
//     CustEmail: _email,
//     CustPw: _passw,
//   },
// };
// fs.writeFile('./views/data/customerList.json', '', (err) => {
//   if (err) throw err;
// });
// fs.open('./views/data/customerList.json', 'a', 666, function (err, fd) {
//   if (err) throw err;
//   fs.write(fd, JSON.stringify(formDataObj), null, 'utf8', function () {
//     fs.close(fd, function () {
//       console.log('file closed');
//     });
//   });
// });
// res.redirect('/registerSuccess');
