// node plugins
var fs = require('fs')
var del = require('del')

// npm plugins
var gulp = require('gulp');
var sass = require('gulp-sass');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var browserSync = require('browser-sync');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var nunjucksRender = require('gulp-nunjucks-render');
var data = require('gulp-data');
var runSequence = require('run-sequence');

var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');

// had to install gem scss-lint for gulp scss linter to work
var scssLint = require('gulp-scss-lint');

var Server = require('karma').Server

function customPlumber(errTitle){
  // if on Travis
  if (process.env.CI) {
    // use Plumber to throw error
    return plumber({
      errorHandler: function(err){
        throw Error(err.message)
      }
    })
  } else {
    // use Plumber to notify error but not break gulp watch
    return plumber({
      errorHandler: notify.onError({
        // customizing error title
        title: errTitle || "Error running Gulp",
        message: "Error: <%= error.message %>",
      })
    })
  }
}

gulp.task('sass', function(){
  return gulp.src('app/scss/**/*.scss') // get source files with gulp.src
    // Checks for errors all plugins
    // replacing plumber with customPlumber
    // errTitle is "Error Running Sass"
    .pipe( customPlumber("Error Running Sass") )
    .pipe( sourcemaps.init() ) // initialize sourmaps
    .pipe( sass({
      // includes bower_components as a import location
      includePaths: ['app/bower_components']
    }) ) // sends it through a gulp plugin
    .pipe( autoprefixer({
      browsers: ['>1%', 'last 2 versions']
    }) ) // runs produced css through autoprefixer be4 being output to dest folder
    .pipe( sourcemaps.write() ) // writing sourcemaps
    .pipe( gulp.dest('app/css') ) // outputs the file in the destination folder
    // Tells Browser Sync to reload files task is done
    .pipe( browserSync.reload({
      stream: true
    }))
})

gulp.task('browserSync', function(){
  browserSync({
    server: {
      baseDir: 'app',
      browser: ['google chrome', 'firefox']
    },
  })
})

gulp.task('nunjucks', function(){
  // first tell gulp where to locate the nunjucks files, then, we pipe these files through nunjucksRender and output them into app folder
  return gulp.src('app/pages/**/*.+(html|nunjucks)')
    .pipe( customPlumber('Error Running Nunjucks') )
    .pipe(data(function(){
      return JSON.parse(fs.readFileSync('./app/data.json'))
    }))
    // specifying a path to the templates with the path key
    .pipe( nunjucksRender({
      path: ['app/templates']
    }))
    .pipe( gulp.dest('app') )
    .pipe(browserSync.reload({
      stream:true
    }));
})

gulp.task('watch', function(){
  gulp.watch([
    'app/templates/**/*',
    'app/pages/**/*.+(html|nunjucks)',
    'app/data.json'
  ], ['nunjucks'])
  // runs sass task when a scss file is changed
  gulp.watch('app/scss/**/*.scss',['sass']);
  gulp.watch('app/js/**/*.js', ['lint:js']);
  // reoloads the browser when a JS file is saved
  gulp.watch('app/js/**/*.js', browserSync.reload)
  gulp.watch('app/*.html', browserSync.reload);
})

// i had to remove the callback function inside the function
gulp.task('clean:dev', function(){
  del.sync([
    'app/css',
    'app/*.html'
  ])
})

// Consolidated dev phase task -> When a task is called default, it will be run when we type gulp in the command line
gulp.task('default', function(callback){
  runSequence(
    'clean:dev',
    ['lint:js', 'lint:scss'],
    ['sass','nunjucks'],
    ['browserSync', 'watch'],
    callback
  )
})

// Default task for Dev-CI
gulp.task('dev-ci', function(callback){
  runSequence(
    'clean:dev',
    ['lint:js', 'lint:scss'],
    ['sass','nunjucks'],
    callback
  )
})

// Linter for Javascript
gulp.task('lint:js', function(){
  return gulp.src('app/js/**/*.js')
    // Catching errors with customPlumber
    .pipe( customPlumber('JSHint Error') )
    .pipe( jshint() )
    // why dont u need to require jshint-stylish to actually use it
    .pipe( jshint.reporter('jshint-stylish') )
    // Catching all JSHint errors
    .pipe( jshint.reporter('fail') )
    // Adding JSCS to lint:js task
    .pipe( jscs({
      // Fix errors
      fix: true,
      // This is needed to make fix work
      configPath: '.jscsrc'
    }) )
    // removed JSCS reporter so we do not get duplicate error with JShint
    .pipe ( gulp.dest('app/js') )
})

gulp.task('lint:scss', function() {
  return gulp.src('app/scss/**/*.scss')
  // linting files with scssLint
  .pipe( scssLint({
    // Pointing to config file
    config: '.scss-lint.yml'
  }) )
})

gulp.task('test', function(done) {
  new Server({
    configFile: process.cwd() + '/karma.conf.js',
    singleRun: true
  }, done).start();
})
