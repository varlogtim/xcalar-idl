<?php

function connect() {
    $server = "heisenberg";
    $username = "jyang";
    $password = "heisenberg";

    $con = mysql_connect($server, $username, $password);

    if (!$con) {
        echo "No!";
        die($conn->connect_error);
    }

    $db_selected = mysql_select_db("ui", $con);
    if (!$db_selected) {
        echo "No2!";
        die();
    }
}

function getAllCols() {
    $sql = "SELECT * FROM everything";
    $res = mysql_query($sql);

    if (!$res) {
        echo "no result";
    }

    while ($row = mysql_fetch_row($res)) {
        print_r($row);
    }
}

connect();
getAllCols();
?>
