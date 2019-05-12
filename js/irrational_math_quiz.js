dmq_version = "1.0";

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

function RandInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function colored_string(str, color){
    return ("[[;" + color + ";]" + str + "]");
}

function update_stats_display(ncorrect, nwrong, ndone){
    $('#ncorrect').html(String(ncorrect));
    $('#nwrong').html(String(nwrong));
    $('#ndone').html(String(ndone));
}

//-----------------------------------------------------------------------------
// timer clock

var clock = new FlipClock($('.clock'), 0, {
    clockFace: 'MinuteCounter'
});

$('#timer_block').css('left', $(window).width()-400)

var pause_timer = function(){
    clock.stop();
    $('#pause-timer').html("Resume");
}

$('#pause-timer').click(function(){
    if (clock.running){
	pause_timer();
    }else{
	clock.start();
	$('#pause-timer').html("Pause");
    }
});

//-----------------------------------------------------------------------------
// game definitions

var make_game = function(name, opstr, opfunc, options){
    options = options || {};
    var x, y;
    var mode_name = name;
    var start_time, end_time;
    var ncorrect = 0;
    var nwrong = 0;
    var ndone = 0;
    var nproblems = 20;
    var nattempts = 0;
    var max_attempts = options.max_attempts || 3;
    var init_problem = function(){
	if (options.initfunc){
	    initdat = options.initfunc();
	    x = initdat.x;
	    y = initdat.y;
	}else{
	    x = RandInt(options.min || 2, options.max || 14);
	    y = RandInt(options.min || 2, options.max || 14);
	}
	start_time = new Date().getTime() / 1000;
	nattempts = 0;
    }
    init_problem();
    var time_interval = function(){
	var dt = clock.time.getSeconds();
	var minutes = Math.floor(dt/60);
	var seconds = dt - minutes * 60;
	ret = String(seconds) + " seconds";
	if (minutes){ ret = String(minutes) + " minutes and " + ret }
	return ret;
    }
    var problem_string = function(){
	return (String(x) + " " + opstr + " " + String(y));
    }
    var check_result = function(response){
	var expected = opfunc(x, y);
	var ok = 0;
	var retry = 0;
	nattempts += 1;
	if (response == expected){
	    retstr = colored_string("Correct", "green");
	    ncorrect += 1;
	    ok = 1;
	}else{
	    retstr = colored_string("Sorry, that's wrong\n", "red");
	    if (nattempts >= max_attempts){
		retstr += colored_string("You have run out of attempts\n", "white");
		retstr += colored_string(problem_string() + " = " + String(expected), "red");
		nwrong += 1
	    }else{
		retstr += colored_string("Please try again (" + String(max_attempts - nattempts) + " more attempts allowed)\n", "white");
		retry = 1;
	    }
	}

	stop_time = new Date().getTime() / 1000;
	var dt = stop_time - start_time;
	try {
	    log_math_quiz({'mode': mode_name,
			   'dt': dt,
			   'x': x,
			   'y': y,
			   'response': response,
			   'expected': expected,
			   'ok': ok,
			   'attempt': nattempts,
			   'user': the_username.toLowerCase(),
			  });
	} catch(err){
	}

	if (!retry){
	    init_problem();
	    ndone += 1;
	}
	update_stats_display(ncorrect, nwrong, ndone);

	if (ndone==nproblems){
	    pause_timer();
	    retstr += colored_string("\nAll done with " + String(ndone) + " problems in " + time_interval() + "!\n", "orange");
	    retstr += colored_string("You got " + String(ncorrect) + " correct, and " + String(nwrong) + " wrong\n ", "white");
	}

	return retstr;
    }
    var make_prompt = function(set_prompt){
	set_prompt("What is " + problem_string() + " ?  ");
    }

    return {
	prompt: make_prompt,
	check: check_result,
	set_nproblems: function(n){  nproblems = n; },
	get: function(expr){ return eval(expr); },
    };
}

var mult_game = make_game('mult', "*", function(x,y){ return x*y; }, {max: 12});
var add_game = make_game('add', "+", function(x,y){ return x+y; }, {max: 100});
var sub_game = make_game('sub', "-", function(x,y){ return x-y; }, {max: 100});
var div_game = make_game('div', "/",
			 function(x,y){ return x/y; },
			 {initfunc: function(){
			     var y = RandInt(2, 12);
			     var ans = RandInt(2, 12);
			     var x = y*ans;
			     return {x: x, y: y};
			   }
			 }
			);

var js_game = {
    prompt: "js> ",
    check: function(command){
        try {
            var result = window.eval(command);
            if (result !== undefined) {
                return(new String(result));
            }
        } catch(e) {
            return(new String(e));
        }
    },
}

var games_available = {'multiplication': mult_game,
		       'division': div_game,
		       'addition': add_game,
		       'subtraction' : sub_game,
		       'js': js_game,
		      }

var game_choice = "multiplication";
var the_game = games_available[game_choice];
var nproblems = 20;
var the_username = "";

//-----------------------------------------------------------------------------
// setup interaction functions / game checks

function do_setup(){
    game_choice = getUrlParameter("GameChoice") || "multiplication";
    nproblems = Number(getUrlParameter("nproblems") || 20);
    the_username = getUrlParameter("username") || "unknown";
    the_game = games_available[game_choice];
    the_game.set_nproblems(nproblems);
}

do_setup();

//-----------------------------------------------------------------------------
// terminal interaction

jQuery(function($, undefined) {
    $('#term_demo').terminal(function(command, term) {
        if (command !== '') {
	    term.echo(the_game.check(command));
        } else {
           term.echo('');
        }
    }, {
        greetings: colored_string("Irrational Math Quiz", "yellow") + ': Version '
	    + String(dmq_version) + "\n"
	    + colored_string("Welcome " + the_username + "!\n", "white")
	    + "Let's do " + nproblems + " " + game_choice + " problems\n ",
        name: 'daddy_math_quiz',
        // height: '100%',
	height: $(window).height() - $('#term_demo').offset().top - 30,
        prompt: the_game.prompt,
    });
});
