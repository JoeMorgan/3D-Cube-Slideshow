/*global alert: false, confirm: false, console: false, Debug: false, $: false, jQuery: false, window: false */

var obj = {
	settings: {}
};
var bar = true;




// GETTING CUTE WITH EXPRESSIONS

obj.settings.unhighlight && obj.settings.unhighlight.call(obj);


obj.settings.showErrors ? obj.settings.showErrors.call(obj, obj.errorMap) : obj.defaultShowErrors();


// CURLY CONTROVERSY

if($.fn.resetForm) 
	$(obj.currentForm).resetForm();

function isHidden(objRef){
	return 
	{
		settings: obj.settings
	};
}


// JAVASCRIPT: THE BAD PARTS

var propVal = eval("var result = obj." + "settings");

with(obj){
	foo = bar;
}									


// TROUBLE WITH VARIABLES

var name = "Dan";

function getName(){
	console.log(name);
	var name = "Paul";
	return name;
}

newName = getName();