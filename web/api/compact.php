<?php
function error($code, $msg) {
  http_response_code($code);
  die( json_encode( array("error" => $msg) ) );
}

function check_errors() {
  if ( !isset($_GET["league"]) )    {
    error(400, "Missing league");
  }
}

function get_data($pdo, $league) {
  $query = "SELECT 
    i.id_d, i.mean, median, mode, min, max, exalted, count, i.quantity + i.inc AS quantity
  FROM      league_items_rolling AS i 
  JOIN      data_leagues  AS l 
    ON      l.id = i.id_l 
  WHERE     l.name   = ?
    AND     l.active = 1 
    AND     i.count  > 1 
  ORDER BY  id ASC";

  $stmt = $pdo->prepare($query);
  $stmt->execute([$league]);

  return $stmt;
}

function parse_data($stmt) {
  $payload = array();

  while ($row = $stmt->fetch()) {
    // Form a temporary row array
    $tmp = array(
      'id'       => (int)  $row['id_d'],
      'mean'     =>        $row['mean']     === NULL ?  0.0 : (float) $row['mean'],
      'median'   =>        $row['median']   === NULL ?  0.0 : (float) $row['median'],
      'mode'     =>        $row['mode']     === NULL ?  0.0 : (float) $row['mode'],
      'min'      =>        $row['min']      === NULL ?  0.0 : (float) $row['min'],
      'max'      =>        $row['max']      === NULL ?  0.0 : (float) $row['max'],
      'exalted'  =>        $row['exalted']  === NULL ?  0.0 : (float) $row['exalted'],
      'count'    =>        $row['count']    === NULL ?    0 :   (int) $row['count'],
      'quantity' =>        $row['quantity'] === NULL ?    0 :   (int) $row['quantity']
    );

    // Append row to payload
    $payload[] = $tmp;
  }

  return $payload;
}

// Define content type
header("Content-Type: application/json");

// Check parameter errors
check_errors();

// Connect to database
include_once ( "../details/pdo.php" );

// Get database entries
$stmt = get_data($pdo, $_GET["league"]);

// If no results with provided id
if ($stmt->rowCount() === 0) {
  error(400, "No results");
}

$data = parse_data($stmt);

// Display generated data
echo json_encode($data, JSON_PRESERVE_ZERO_FRACTION);
