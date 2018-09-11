<?php
function get_data($pdo) {
  $query = 'SELECT changeId as id, time FROM data_changeId';

  $stmt = $pdo->query($query);
  $payload = $stmt->fetch();

  return $payload;
}

// Define content type
header('Content-Type: application/json');

// Connect to database
include_once ( '../details/pdo.php' );

// Get data from database
$payload = get_data($pdo);

// Display generated data
echo json_encode($payload);
