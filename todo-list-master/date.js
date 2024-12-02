// console.log(module);

exports.getDateFrom_datejs_module = function() {
  const today = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return today.toLocaleDateString("en-GB", options);
}

exports.getDateWitoutYearFrom_datejs_module = function(s) {
  const today = new Date();
  const options = { weekday: "long", month: "long", day: "numeric" };
  return today.toLocaleDateString("en-GB", options);
}
