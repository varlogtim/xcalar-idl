window.Dashboard = (function(Dashboard, $) {

      //<div class = "grid" id = "xceTest"></div>
      //<div class = "grid" id = "xdTest"></div>
      //<div class = "grid" id = "funcTest"></div>
      //<div class = "grid" id = "countdown"></div>

    Dashboard.setup = function() {
        $("#xceTest").html("<iframe src='http://graphite-dev.int.xcalar.com/dashboard/db/cluster?var-cluster=All&var-node=edison0_int_xcalar_com&var-node=edison1_int_xcalar_com&from=1484166853087&to=1484167753087'></iframe>");
        $("#xdTest").html("<iframe src='http://graphite.int.xcalar.com/dashboard/db/graphite-server-carbon-metrics'></iframe>");
        $("#funcTest").html('<iframe src="http://graphite.int.xcalar.com/dashboard/db/functests"></iframe>');
        $("#burndown").html('<iframe src="https://docs.google.com/spreadsheets/d/1L3JeNoZQ0NHn90wsGfl2rbHu8HHgCUm-FhhlYE9IJcQ/pubchart?oid=1678143306&amp;format=interactive"></iframe>');
        var s = '<div class="tc_div_37089" style="background-color:rgba(0, 0, 0, 0)"><a title="Cloud Preview Launch" href="https://www.tickcounter.com/countdown/1485935999000/america-los_angeles/dhms/000000328CAFFFFFFFFFFFFF/Cloud_Preview_Launch">Cloud Preview Launch</a><a title="Countdown" href="https://www.tickcounter.com/">Countdown</a></div><script type="text/javascript">(function(){ var s=document.createElement(\'script\');s.src="//www.tickcounter.com/loader.js";s.async=\'async\';s.onload=function() { tc_widget_loader(\'tc_div_37089\', \'Countdown\', 650, [\'1485935999000\', \'america-los_angeles\', \'dhms\', \'000000328CAFFFFFFFFFFFFF\', \'650\', \'C0C0C01\', \'Cloud Preview Launch\']);};s.onreadystatechange=s.onload;var head=document.getElementsByTagName(\'head\')[0];head.appendChild(s);}());</script>';
        $("#countdown").html(s);
        $("#bugzilla").html("<iframe src='http://bugs/report.cgi?bug_status=ASSIGNED&bug_status=UP_FOR_GRABS&bug_status=IN_PROGRESS&cumulate=0&priority=ShowStopper&priority=MustFix&product=Xcalar&resolution=---&target_milestone=1.0.3.17%20%28Jan%29&target_milestone=Jan%20Sprint&x_axis_field=resolution&y_axis_field=component&format=table&action=wrap&saved_report_id=3'></iframe>");
    };

    return (Dashboard);
}({}, jQuery));


$(document).ready(function() {
    Dashboard.setup();
});
