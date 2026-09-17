require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var cors = require('cors');
var mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./modules/auth/auth.route');
var dashboardRouter = require('./modules/dashboard/dashboard.route');
var adminRouter = require('./modules/admin/admin.routes');
var staffRouter = require('./modules/staff/staff.routes');
var vehiclesRouter = require('./modules/vehicles/vehicles.routes');
var certificatesRouter = require('./modules/certificates/certificates.routes');
var fuelsRouter = require('./modules/fuels/fuels.routes');
var adblueRouter = require('./modules/adblue/adblue.routes');
var servicesRouter = require('./modules/services/services.routes');
var repairBillsRouter = require('./modules/repair-bills/repair-bills.routes');
var busBreakdownRouter = require('./modules/bus-breakdown/bus-breakdown.routes');
var batteriesRouter = require('./modules/batteries/batteries.routes');
var vehicleTyresRouter = require('./modules/vehicle-tyres/vehicle-tyres.routes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// app.use(cors());
app.use(cors({
  origin: 'https://vms.adityauniversity.in',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/', authRouter);
app.use('/', dashboardRouter);
app.use('/', adminRouter);
app.use('/', staffRouter);
app.use('/', vehiclesRouter);
app.use('/', certificatesRouter);
app.use('/', fuelsRouter);
app.use('/', adblueRouter);
app.use('/', servicesRouter);
app.use('/', repairBillsRouter);
app.use('/', busBreakdownRouter);
app.use('/', batteriesRouter);
app.use('/', vehicleTyresRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
