<?php 
  include_once ( "../details/pdo.php" );
  include_once ( "assets/php/functions.php" );
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <title>EasyBuyout - PoeWatch</title>
  <meta charset="utf-8">
  <link rel="icon" type="image/png" href="assets/img/ico/192.png" sizes="192x192">
  <link rel="icon" type="image/png" href="assets/img/ico/96.png" sizes="96x96">
  <link rel="icon" type="image/png" href="assets/img/ico/32.png" sizes="32x32">
  <link rel="icon" type="image/png" href="assets/img/ico/16.png" sizes="16x16">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">
  <link rel="stylesheet" href="assets/css/main.css">
</head>
<body>
<!-- Primary navbar -->
<?php GenNavbar($pdo) ?>
<!--/Primary navbar/-->
<!-- Page body -->
<div class="container-fluid">
  <div class="row">
    <div class="col d-flex my-3">

      <!-- Menu -->
      <?php GenCatMenuHTML($pdo) ?>
      <!--/Menu/-->

      <!-- Main content -->
      <div class="d-flex w-100 justify-content-center"> 
        <div class='body-boundaries w-100'> 
          <!-- MotD -->
          <?php GenMotDBox(); ?>
          <!--/MotD/-->

          <div class="card custom-card">
            <div class="card-header">
              <h3>EasyBuyout</h3>
            </div>
            <div class="card-body">
              <div>Ever felt a need for a tool for quickly adding buyout notes to masses of items based on their average prices?</div>
              <div class='mb-3'>Well, look no further!</div>
              <img src="assets/img/pricer.gif" class="float-right ml-3 rounded img-fluid">
              <h5 class="text-white">How does it work?</h5>
              <p class="paragraph-text">When you right-click an item in a premium tab (or any tab), this handy program copies the item data, matches it against its database and instantly pastes a buyout note containing the average price.</p>
              <h5 class="text-white">Who is it for?</h5>
              <p class="paragraph-text">Players who are tired of induvidually pricing hundreds of items in their stash tabs. Be you a labrunner or an Uber Atziri farmer who has dozens upon dozens of gems or maps that need prices or maybe just your average player who wants to actually enjoy the game instead of playing Shoppe Keep all day long. Well, in that case this program is perfect for you.</p>
              <h5 class="text-white">What can it price?</h5>
              <p class="paragraph-text">Armours, weapons, accessories, flasks, 6-links, 5-links, jewels, gems, divination cards, maps, currency, prophecies, essences, normal, magic and rare items. In short: if it's an item, this program can find a price for it.</p>
              <h5 class="text-white">Where can I get one?</h5>
              <a class="btn btn-outline-dark mb-2" href="https://github.com/siegrest/EasyBuyout/releases/latest">Over at GitHub</a>
            </div>
            <div class="card-footer slim-card-edge"></div>
          </div>
        </div>
      </div>
      <!--/Main content/-->

    </div>
  </div>
</div>
<!--/Page body/-->
<!-- Footer -->
<?php GenFooter() ?>
<!--/Footer/-->
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js"></script>
</body>
</html>
