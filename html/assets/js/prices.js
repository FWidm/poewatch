/*
  There's not much here except for some poorly written JS functions. And since you're 
  already here, it can't hurt to take a look at http://youmightnotneedjquery.com/
*/

let FILTER;
var ITEMS = [];
var LEAGUES = [];
var CATEGORIES = {};
var HISTORY_DATA = {};
let HISTORY_CHART;
let HISTORY_LEAGUE;
let INTERVAL;

var PARSE_AMOUNT = 100;
var COUNTER = {
  lowCount: 0,
  categories: {}
};

const PRICE_PERCISION = 100;
const COUNT_ENCH_HIGH = 100;
const COUNT_ENCH_MED = 50;
const COUNT_HIGH = 25;
const COUNT_MED = 15;
const MINOR_CHANGE = 50;
const MAJOR_CHANGE = 100;

var parentRow, expandedRow;
var expandedRowTemplate = `<tr class='selected-row'><td colspan='100'>
  <div class='row m-1'>
    <div class='col-md'>
      <h4>Chaos value</h4>
      <div class='chart-small'><canvas id="chart-price"></canvas></div>
    </div>
    <div class='col-md'>
      <h4>Listed per 24h</h4>
      <div class='chart-small'><canvas id="chart-quantity"></canvas></div>
    </div>
  </div>
  <hr>
  <div class='row m-1 mt-2'>
    <div class='col-md'>
      <table class="table table-sm details-table">
        <tbody>
          <tr id='details-row-mean'>
            <td>Current mean</td>
          </tr>
          <tr id='details-row-median'>
            <td>Current median</td>
          </tr>
          <tr id='details-row-mode'>
            <td>Current mode</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class='col-md'>
      <table class="table table-sm details-table">
        <tbody>
          <tr id='details-row-quantity'>
            <td>Average listed per 24h</td>
          </tr>
          <tr id='details-row-1d'>
            <td>Price since yesterday</td>
          </tr>
          <tr id='details-row-1w'>
            <td>Price since 1 week</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <hr>
  <div class='row m-1 mb-3'>
    <div class='col-sm'>
      <h4>Past leagues</h4>
      <div class="btn-group btn-group-toggle my-3" data-toggle="buttons" id="history-league-radio"></div>
      <div class='chart-large'><canvas id="chart-past"></canvas></div>
    </div>
  </div>
</td></tr>`;

$(document).ready(function() {
  var category = getUrlParameter("category");
  if (!category) return;

  readServiceContainers();

  FILTER = {
    league: LEAGUES[0],
    category: category,
    sub: "all",
    hideLowConfidence: true,
    links: "",
    search: "",
    gemLvl: "",
    gemQuality: "",
    gemCorrupted: ""
  };

  fillSelectors(category);
  readCookies();
  makeRequest();

  // Define league event listener
  $("#search-league").on("change", function(){
    FILTER.league = $("input[name=league]:checked", this).val();
    console.log(FILTER.league);
    document.cookie = "league="+FILTER.league;
    ITEMS = [];
    makeRequest();
  });

  // Define subcategory event listener
  $("#search-sub").change(function(){
    FILTER.sub = $(this).find(":selected").val();
    console.log("sub-category: '" + FILTER.sub + "'");
    sortResults();
  });

  // Define load all button listener
  var loadall = $(".loadall");
  $(loadall, "button").on("click", function(){
    console.log("loadall");
    loadall.hide();

    PARSE_AMOUNT = -1;
    sortResults();
  });

  // Define searchbar event listener
  $("#search-searchbar").on("input", function(){
    FILTER.search = $(this).val().toLowerCase().trim();
    console.log("search: '" + FILTER.search + "'");
    sortResults();
  });

  // Define low confidence radio button event listener
  $("#radio-confidence").on("change", function(){
    let newValue = $("input:checked", this).val();
    console.log(newValue);
    
    if (newValue != FILTER.hideLowConfidence) {
      FILTER.hideLowConfidence = !FILTER.hideLowConfidence;
      sortResults();
    }

    /*var tempLabel = $("label", this);
    if ( $("input", tempLabel[0]).is(":checked") ) {
      $("span", tempLabel[0]).text("Hide");
      $("span", tempLabel[1]).text("Show" + " (" + COUNTER.lowCount + ")");
    } else {
      $("span", tempLabel[0]).text("Hide" + " (" + COUNTER.lowCount + ")");
      $("span", tempLabel[1]).text("Show");
    }*/
  });

  // Define link radio button event listener
  $("#radio-links").on("change", function(){
    FILTER.links = $("input[name=links]:checked", this).val();
    console.log(FILTER.links);
    sortResults();
  });

  // Define gem selector and radio event listeners
  $("#select-level").on("change", function(){
    FILTER.gemLvl = $(":selected", this).val();
    console.log(FILTER.gemLvl);
    sortResults();
  });
  $("#select-quality").on("change", function(){
    FILTER.gemQuality = $(":selected", this).val();
    console.log(FILTER.gemQuality);
    sortResults();
  });
  $("#radio-corrupted").on("change", function(){
    FILTER.gemCorrupted = $(":checked", this).val();
    console.log(FILTER.gemCorrupted);
    sortResults();
  });

  // Define tr click event
  $("#searchResults > tbody").delegate("tr", "click", function(event) {
    onRowClick(event);
  });

  // Define live search toggle listener
  $("#live-updates").on("change", function(){
    var live = $("input[name=live]:checked", this).val() == "true";
    console.log("Live updates: " + live);
    document.cookie = "live="+live;

    var bar = $("#progressbar-live");
    if (live) {
      bar.css("animation-name", "progressbar-live");
      INTERVAL = setInterval(timedRequestCallback, 60 * 1000);
    } else {
      bar.css("animation-name", "");
      clearInterval(INTERVAL);
    }
  });
}); 

//------------------------------------------------------------------------------------------------------------
// Data prep
//------------------------------------------------------------------------------------------------------------

function readServiceContainers() {
  $(".service-container").each(function() {
    var container = $(this);
    var id = container.attr("id");
    var payload = container.data("payload");
    payload = payload.replace(/'/g, '"');

    switch (id) {
      case "service-leagues":
        LEAGUES = JSON.parse(payload);
        break;
      case "service-categories":
        CATEGORIES = JSON.parse(payload);
        break;
    }
  });
}

function fillSelectors(category) {
  var leagueSelector = $("#search-league");
  $.each(LEAGUES, function(index, league) {
    var button = "<label class='btn btn-sm btn-outline-dark btn-outline-dark-alt p-0 px-1'>";
    button += "<input type='radio' name='league' value='"+league+"'>"+league+"</label>";
    leagueSelector.append(button); 
  });

  var categorySelector = $("#search-sub");
  categorySelector.append($("<option></option>").attr("value", "all").text("All")); 

  $.each(CATEGORIES[category], function(index, child) {   
    categorySelector.append($("<option></option>").attr("value", child).text(toTitleCase(child)));
  });

  // Add price table headers
  var tableHeaderContent = "<th scope='col'>Item</th>";
  if (category === "gems") {
    tableHeaderContent += "<th scope='col'>Lvl</th>";
    tableHeaderContent += "<th scope='col'>Qual</th>";
    tableHeaderContent += "<th scope='col'>Corr</th>";
  }
  tableHeaderContent += "<th scope='col'>Chaos</th>";
  tableHeaderContent += "<th scope='col'>Exalted</th>";
  tableHeaderContent += "<th scope='col'>Change</th>";
  tableHeaderContent += "<th scope='col'>Count</th>";
  $("#searchResults > thead > tr").append(tableHeaderContent);
}

function readCookies() {
  var live = getCookie("live")
  if (live) {
    console.log("Got live flag from cookie: " + live);

    if (live == "true") {
      INTERVAL = setInterval(timedRequestCallback, 60 * 1000);
      $("#progressbar-live").css("animation-name", "progressbar-live");
    }

    $("#live-updates input").filter(function() { 
      return ($(this).val() === live);
    }).prop("active", true).trigger("click");
  }

  var league = getCookie("league");
  if (!league) {
    $("#search-league input").filter(function() { 
      return ($(this).val() === FILTER.league);
    }).prop("active", true).trigger("click");
  } else {
    console.log("Got league from cookie: " + league);
    FILTER.league = league.toLowerCase();
    
    $("#search-league input").filter(function() { 
      return ($(this).val() === league);
    }).prop("active", true).trigger("click");
  }
}

//------------------------------------------------------------------------------------------------------------
// Expanded row
//------------------------------------------------------------------------------------------------------------

function onRowClick(event) {
  var target = $(event.currentTarget);
  var parentIndex = parseInt(target.attr("value"));

  // If user clicked on the smaller embedded table
  if (isNaN(parentIndex)) return;

  console.log("Clicked on row: " + parentIndex + " (" + ITEMS[parentIndex]["name"] + ")");

  // Close row if user clicked on parentRow
  if (target.is(parentRow)) {
    console.log("Closed row");
    expandedRow.remove();
    parentRow.removeAttr("class");
    parentRow = null;
    expandedRow = null;
    return;
  }

  // Don't add a new row if user clicked on expandedRow
  if (target.is(expandedRow)) return;

  // If there's an expanded row open somewhere, remove it
  if (expandedRow) {
    expandedRow.remove();
    parentRow.removeAttr("class");
  }

  expandedRow = $(expandedRowTemplate);
  // Place ChartJS charts inside the expanded row
  //placeCharts(parentIndex, expandedRow);

  // Make request if data not present
  if (ITEMS[parentIndex]["index"] in HISTORY_DATA) {
    console.log("history from: memory");
    placeCharts(parentIndex, expandedRow);
    displayHistory(ITEMS[parentIndex]["index"], expandedRow);
  } else {
    console.log("history from: source");
    makeHistoryRequest(ITEMS[parentIndex].parent, parentIndex, expandedRow);
  }

  // Fill expanded row with item data
  var chaosIcon = "<img src='http://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png?scale=1&scaleIndex=1&w=1&h=1'>";
  $("#details-row-quantity",  expandedRow).append("<td>"+ITEMS[parentIndex]["quantity"]+"</td>");
  $("#details-row-mean",      expandedRow).append("<td>"+chaosIcon+ITEMS[parentIndex]["mean"]+"</td>");
  $("#details-row-median",    expandedRow).append("<td>"+chaosIcon+ITEMS[parentIndex]["median"]+"</td>");
  $("#details-row-mode",      expandedRow).append("<td>"+chaosIcon+ITEMS[parentIndex]["mode"]+"</td>");

  let history = ITEMS[parentIndex]["history"]["mean"];
  var chaosChangeDay = roundPrice(ITEMS[parentIndex]["mean"] - history[history.length - 1]);
  var chaosChangeWeek = roundPrice(ITEMS[parentIndex]["mean"] - history[0]);

  $("#details-row-1d",        expandedRow).append("<td>"+chaosIcon+(chaosChangeDay  > 0 ? '+' : '')+chaosChangeDay+"</td>");
  $("#details-row-1w",        expandedRow).append("<td>"+chaosIcon+(chaosChangeWeek > 0 ? '+' : '')+chaosChangeWeek+"</td>");

  target.addClass("parent-row");
  target.after(expandedRow);

  // Create event listener for league selector
  var historyLeagueRadio = $("#history-league-radio", expandedRow);
  historyLeagueRadio.change(function(){
    HISTORY_LEAGUE = $("input[name=league]:checked", this).val();;

    if (HISTORY_LEAGUE in HISTORY_DATA[ITEMS[parentIndex]["index"]]) {
      HISTORY_CHART.data.labels = HISTORY_DATA[ITEMS[parentIndex]["index"]][HISTORY_LEAGUE];
      HISTORY_CHART.data.datasets[0].data = HISTORY_DATA[ITEMS[parentIndex]["index"]][HISTORY_LEAGUE];
      HISTORY_CHART.update();
    }
  });

  parentRow = target;
}

function placeCharts(index, expandedRow) {
  var priceData = {
    type: "line",
    data: {
      labels: getAllDays(ITEMS[index]["history"]["mean"].length),
      datasets: [{
        label: "Price in chaos",
        data: ITEMS[index]["history"]["mean"],
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderColor: "#fff",
        borderWidth: 1,
        lineTension: 0,
        pointRadius: 0
      }]
    },
    options: {
      legend: {display: false},
      responsive: true,
      maintainAspectRatio: false,
      animation: {duration: 0},
      hover: {animationDuration: 0},
      responsiveAnimationDuration: 0,
      tooltips: {
        intersect: false,
        mode: "index",
        callbacks: {
          title: function(tooltipItem, data) {
            return data['datasets'][0]['data'][tooltipItem[0]['index']] + "c";
          },
          label: function(tooltipItem, data) {
            return data['labels'][tooltipItem['index']];
          }
        },
        backgroundColor: '#fff',
        titleFontSize: 16,
        titleFontColor: '#222',
        bodyFontColor: '#444',
        bodyFontSize: 14,
        displayColors: false,
        borderWidth: 1,
        borderColor: '#aaa'
      }
    }
  }
  
  var quantData = {
    type: "line",
    data: {
      labels: getAllDays(ITEMS[index]["history"]["quantity"].length),
      datasets: [{
        label: "Quantity",
        data: ITEMS[index]["history"]["quantity"],
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderColor: "#fff",
        borderWidth: 1,
        lineTension: 0,
        pointRadius: 0
      }]
    },
    options: {
      legend: {display: false},
      responsive: true,
      maintainAspectRatio: false,
      animation: {duration: 0},
      hover: {animationDuration: 0},
      responsiveAnimationDuration: 0,
      tooltips: {
        intersect: false,
        mode: "index",
        callbacks: {
          title: function(tooltipItem, data) {
            return "Quantity: " + data['datasets'][0]['data'][tooltipItem[0]['index']];
          },
          label: function(tooltipItem, data) {
            return data['labels'][tooltipItem['index']];
          }
        },
        backgroundColor: '#fff',
        titleFontSize: 16,
        titleFontColor: '#222',
        bodyFontColor: '#444',
        bodyFontSize: 14,
        displayColors: false,
        borderWidth: 1,
        borderColor: '#aaa'
      }
    }
  }

  var pastData = {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Price in chaos",
        data: [],
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderColor: "#fff",
        borderWidth: 1,
        lineTension: 0,
        pointRadius: 0
      }]
    },
    options: {
      legend: {
        display: false
      },
      responsive: true,
      maintainAspectRatio: false,
      animation: {duration: 0},
      hover: {animationDuration: 0},
      responsiveAnimationDuration: 0,
      tooltips: {
        intersect: false,
        mode: "index",
        callbacks: {
          title: function(tooltipItem, data) {
            return data['datasets'][0]['data'][tooltipItem[0]['index']] + "c";
          },
          label: function(tooltipItem, data) {
            return "Day " + tooltipItem['index'];
          }
        },
        backgroundColor: '#fff',
        titleFontSize: 16,
        titleFontColor: '#222',
        bodyFontColor: '#444',
        bodyFontSize: 14,
        displayColors: false,
        borderWidth: 1,
        borderColor: '#aaa'
      },
      scales: {
        yAxes: [{ticks: {beginAtZero:true}}],
        xAxes: [{
          ticks: {
            autoSkip: false,
            callback: function(value, index, values) {
              return (index % 7 === 0) ? "Week " + (~~(index / 7) + 1) : null;
            }
          }
        }]
      }
    }
  }

  new Chart($("#chart-price", expandedRow), priceData);
  new Chart($("#chart-quantity", expandedRow), quantData);
  HISTORY_CHART = new Chart($("#chart-past", expandedRow), pastData);
}

function displayHistory(index, expandedRow) {
  if ("error" in HISTORY_DATA[index]) {
    console.log("History data: no results");

    var chartArea = $(".chart-large", expandedRow);
    chartArea.append("<h5 class='text-center my-3'>No results</h5>");
    $("#chart-past", expandedRow).remove();
    $("#history-league-radio", expandedRow).remove();

    return;
  }

  var leagues = Object.keys(HISTORY_DATA[index]);

  if (!HISTORY_LEAGUE) HISTORY_LEAGUE = leagues[0];

  let selectedLeague;
  if (HISTORY_LEAGUE in HISTORY_DATA[index]) selectedLeague = HISTORY_LEAGUE;
  else selectedLeague = leagues[0];

  HISTORY_CHART.data.labels = HISTORY_DATA[index][selectedLeague];
  HISTORY_CHART.data.datasets[0].data = HISTORY_DATA[index][selectedLeague];
  HISTORY_CHART.update();

  var historyLeagueRadio = $("#history-league-radio", expandedRow);
  $.each(leagues, function(index, league) {
    var selected = (selectedLeague === league ? " active" : "");

    var button = "<label class='btn btn-outline-dark"+selected+"'>";
    button += "<input type='radio' name='league' value='"+league+"'>"+league+"</label>";

    historyLeagueRadio.append(button); 
  });
}

//------------------------------------------------------------------------------------------------------------
// Requests
//------------------------------------------------------------------------------------------------------------

function makeRequest() {
  var data = {
    league: FILTER.league, 
    category: FILTER.category
  };

  var request = $.ajax({
    url: "http://api.poe-stats.com/get",
    data: data,
    type: "GET",
    async: true,
    dataTypes: "json"
  });

  request.done(function(json) {
    ITEMS = json;
    sortResults();

    console.log("got " + ITEMS.length + " items");
    
    // Enable "show more" button
    if (ITEMS.length > PARSE_AMOUNT) {
      var loadAllDiv = $(".loadall");
      $("button", loadAllDiv).text("Load more (" + (ITEMS.length - PARSE_AMOUNT) + ")");
      loadAllDiv.show();
    }
  });
}

function makeHistoryRequest(category, parentIndex, expandedRow) {
  var index = ITEMS[parentIndex]["index"];

  var request = $.ajax({
    url: "http://api.poe-stats.com/history",
    data: {
      category: category, 
      index: index
    },
    type: "GET",
    async: true,
    dataTypes: "json"
  });

  request.done(function(payload) {
    HISTORY_DATA[index] = payload;
    placeCharts(parentIndex, expandedRow);
    displayHistory(index, expandedRow);
  });
}

//------------------------------------------------------------------------------------------------------------
// Item data parsing and displaying
//------------------------------------------------------------------------------------------------------------

function parseItem(item, index) {
  // Format icon
  var tmpIcon = item["icon"] ? item["icon"] : (item["frame"] === -1 ? "http://web.poecdn.com/image/Art/2DItems/Currency/Enchantment.png?scale=1&w=1&h=1" : "http://poe-stats.com/assets/img/missing.png");
  var iconField = "<span class='table-img-container text-center mr-2'><img src='" + tmpIcon + "'></span>";

  // Format name and variant/links badge
  var nameField = "<span"+(item["frame"] === 9 ? " class='item-foil'" : "")+">";
  nameField += item["name"];
  if ("type" in item) nameField += "<span class='subtext-1'>, " + item["type"] + "</span>";
  if ("var" in item && item["frame"] !== -1) nameField += " <span class='badge custom-badge-gray'>" + item["var"] + "</span>";
  else if ("tier" in item) nameField += " <span class='badge custom-badge-gray'>" + item["tier"] + "</span>";
  if (item["history"]["mean"].length < 7) nameField += " <span class='badge badge-light'>New</span>";
  nameField += "</span>";

  // Format gem fields
  var gemFields = "";
  if (item["frame"] === 4) {
    gemFields += "lvl" in item ? "<td>" + item["lvl"] + "</td>" : "<td>0</td>";
    gemFields += "quality" in item ? "<td>" + item["quality"] + "</td>" : "<td>0</td>";

    if ("corrupted" in item) {
      if (item["corrupted"] === "1") gemFields += "<td><span class='badge custom-badge-red'>Yes</span></td>";
      else gemFields += "<td><span class='badge custom-badge-green'>No</span></td>";
    }
  }

  // Create sparkline
  var sparkColorClass = item["history"]["change"] > 0 ? "sparkline-green" : "sparkline-orange";
  var sparkLine = document.createElement("svg");
  sparkLine.setAttribute("class", "sparkline " + sparkColorClass);
  sparkLine.setAttribute("width", 60);
  sparkLine.setAttribute("height", 25);
  sparkLine.setAttribute("stroke-width", 3);
  sparkline.sparkline(sparkLine, item["history"]["spark"]);

  // Format price and sparkline field
  var priceField = "<div class='pricebox'>";
  priceField += sparkLine.outerHTML + "<img src='http://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png?scale=1&scaleIndex=1&w=1&h=1'>";
  priceField += roundPrice(item["mean"]);
  priceField += "</div>";

  var exaltedField = "<div class ='pricebox'>";
  if ("exalted" in item && item["exalted"] >= 1) {
    exaltedField += "<img src='http://web.poecdn.com/image/Art/2DItems/Currency/CurrencyAddModToRare.png?scale=1&scaleIndex=1&w=1&h=1'>";
    exaltedField += roundPrice(item["exalted"]);
  }
  exaltedField += "</div>";

  // Format change field
  var tmpChange;
  if (item["history"]["change"] > MAJOR_CHANGE) tmpChange = "custom-badge-green";
  else if (item["history"]["change"] < -1*MAJOR_CHANGE) tmpChange = "custom-badge-orange";
  else if (item["history"]["change"] > MINOR_CHANGE) tmpChange = "custom-badge-green-lo";
  else if (item["history"]["change"] < -1*MINOR_CHANGE) tmpChange = "custom-badge-orange-lo";
  else tmpChange = "custom-badge-gray";
  var changeField = "<span class='badge "+tmpChange+"'>"+Math.round(item["history"]["change"])+"%</span>";

  // Format count badge
  var countField;
  if (item["frame"] === -1) {
    if (item["count"] >= COUNT_ENCH_HIGH) countField = "<span class='badge custom-badge-gray'>" + item["count"] + "</span>";
    else if (item["count"] >= COUNT_ENCH_MED) countField = "<span class='badge custom-badge-orange'>" + item["count"] + "</span>";
    else countField = "<span class='badge custom-badge-red'>" + item["count"] + "</span>";
  } else {
    if (item["count"] >= COUNT_HIGH) countField = "<span class='badge custom-badge-gray'>" + item["count"] + "</span>";
    else if (item["count"] >= COUNT_MED) countField = "<span class='badge custom-badge-orange'>" + item["count"] + "</span>";
    else countField = "<span class='badge custom-badge-red'>" + item["count"] + "</span>";
  }

  // Add it all together
  var returnString = "<tr value=" + ITEMS.indexOf(item) + ">" +
  "<td>" +  iconField + nameField + "</td>" + 
  gemFields +
  "<td>" + priceField + "</td>" + 
  "<td>" + exaltedField + "</td>" + 
  "<td>" + changeField + "</td>" + 
  "<td>" + countField + "</td>" + 
  "</tr>";

  return returnString;
}

//------------------------------------------------------------------------------------------------------------
// Utility functions
//------------------------------------------------------------------------------------------------------------

function getUrlParameter(sParam) {
  var sPageURL = decodeURIComponent(window.location.search.substring(1)),
    sURLVariables = sPageURL.split('&'),
    sParameterName,
    i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : sParameterName[1].trim().toLowerCase();
    }
  }
}

function roundPrice(price) {
  const numberWithCommas = (x) => {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  return numberWithCommas(Math.round(price * PRICE_PERCISION) / PRICE_PERCISION);
}

function randNumbers(size, add, mult) {
  var numbers = [];
  
  for (var i = 0; i < size; i += 1) {
    numbers.push(add + Math.random() * mult);
  }
  
  return numbers;
}

function getAllDays(length) {
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Augt", "Sep", "Oct", "Nov", "Dec"
  ];
  var a = [];
  
  for (let index = length; index > 1; index--) {
    var s = new Date();
    var n = new Date(s.setDate(s.getDate() - index))
    a.push(s.getDate() + " " + MONTH_NAMES[s.getMonth()]);
  }
  
  a.push("Atm");

  return a;
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
          c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
      }
  }
  return "";
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

//------------------------------------------------------------------------------------------------------------
// Sorting and searching
//------------------------------------------------------------------------------------------------------------

function sortResults() {
  // Empty the table
  var table = $("#searchResults");
  $("tbody", table).empty();

  var parsed_count = 0;
  var tableDataBuffer = "";

  for (let index = 0; index < ITEMS.length; index++) {
    const item = ITEMS[index];

    if (PARSE_AMOUNT > 0 && parsed_count > PARSE_AMOUNT) break;

    // Check if item should be displayed in the search
    if ( checkHideItem(item) ) continue;

    // If item has not been parsed, parse it 
    if (!("tableData" in item)) item["tableData"] = parseItem(item, index);

    tableDataBuffer += item["tableData"];
    parsed_count++;
  }

  table.append(tableDataBuffer);
}

function checkHideItem(item) {
  // Hide low confidence items
  if (FILTER.hideLowConfidence) {
    if (item["frame"] === -1 && item["count"] < COUNT_ENCH_MED) return true;
    else if (item["count"] < COUNT_MED) return true;
  }

  // Hide sub-categories
  if (FILTER.sub !== "all" && FILTER.sub !== item["child"]) return true;

  // Hide items with different links
  if (FILTER.links) {
    if (!("links" in item)) return true;
    else if (item["links"] !== FILTER.links) return true;
  } else if ("links" in item) return true;

  // Sort gems, I guess
  if (item["frame"] === 4) {
    if (FILTER.gemLvl !== "") {
      if (item["lvl"] != FILTER.gemLvl) return true;
    }
    if (FILTER.gemQuality !== "") {
      if (FILTER.gemQuality) {
        if (!("quality" in item)) return true;
        if (item["quality"] != FILTER.gemQuality) return true;
      } else {
        if ("quality" in item && item["quality"] > 0) return true;
      }
    }
    // Sort based on corruption selector
    if (FILTER.gemCorrupted === "1" && item["corrupted"] !== "1") return true;
    else if (FILTER.gemCorrupted === "0" && item["corrupted"] !== "0") return true;
  
  } else if (FILTER.category === "currency") {
    // Hide some fairly useless currency
    if (item["frame"] === 5) {
      switch (item["name"]) {
        case "Imprint":
        case "Scroll Fragment":
        case "Alteration Shard":
        case "Binding Shard":
        case "Horizon Shard":
        case "Engineer's Shard":
        case "Chaos Shard":
        case "Regal Shard":
        case "Alchemy Shard":
        case "Transmutation Shard":
          return true;
        default:
          break;
      }

    } else if (item["frame"] === 3 && FILTER.sub === "all") {
      // Hide harbinger pieces under category 'all'
      return true;
    }
  }

  // String search
  if (FILTER.search) {
    var nameBool = ("name" in item && item["name"].toLowerCase().indexOf(FILTER.search) !== -1);
    var typeBool = ("type" in item && item["type"].toLowerCase().indexOf(FILTER.search) !== -1);
    if (!nameBool && !typeBool) return true;
  }
}

//------------------------------------------------------------------------------------------------------------
// Other
//------------------------------------------------------------------------------------------------------------

function countItems() {
  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];

    if ("child" in item) {
      if (item["child"] in COUNTER.categories) {
        COUNTER.categories[item["child"]]++;
      } else {
        COUNTER.categories[item["child"]] = 1;
      }
    }
    
    if (item["count"] < COUNT_MED) COUNTER.lowCount++;
  }

  COUNTER.categories["all"] = ITEMS.length;

  // Update item counter under confidence toggle radio
  var test = $("#radio-confidence label");
  $("span", test[1]).text("Show" + " (" + COUNTER.lowCount + ")");

  console.log(COUNTER);
}

function timedRequestCallback() {
  console.log("Automatic update");

  var data = {
    league: FILTER.league, 
    category: FILTER.category
  };

  var request = $.ajax({
    url: "http://api.poe-stats.com/get",
    data: data,
    type: "GET",
    async: true,
    dataTypes: "json"
  });

  request.done(function(json) {
    ITEMS = [];
    makeRequest();
  });
}
