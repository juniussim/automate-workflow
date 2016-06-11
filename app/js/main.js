(function() {
  // This function is sloppy
}());

(function() {
  This function is strict
  'use strict';
  // why do i need use strict for this document ready function
  $(document).ready(function() {
    console.log( "ready" );
  });



}());

function add(num1, num2) {
  return num1 + num2;
}
