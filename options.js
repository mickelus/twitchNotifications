var REQUEST_PATH_USER = "https://api.twitch.tv/kraken/users/{user}";

var hideTimeout;

chrome.storage.sync.get("username", function(values) {
	if(values["username"] != undefined) {
		document.querySelector("#nameInput").value = values["username"];
	}
	
})
document.querySelector("#nameSubmit").addEventListener("click", submitUsername);


// checks if the username in the username input is valid and stores it in local storage
function submitUsername() {

	var username = document.querySelector("#nameInput").value;
	
	if(username == "") {

		showMessage("Username has been unset.");

		chrome.storage.sync.remove("username");

	} else {
		var request = new XMLHttpRequest();
		var json;

		request.open("GET", REQUEST_PATH_USER.replace("{user}", username), true);
		request.send();

		request.onreadystatechange = function() {
			if(request.readyState == 4 ) {
				console.log("aasd");
				console.log(request.responseText)
				json = JSON.parse(request.responseText);

				if(json["error"] == undefined) {
					
					showMessage("Username has been set.");

					chrome.storage.sync.set({"username" : username})

				} else {

					showMessage("Could not find the specified user.");

					chrome.storage.sync.remove("username");
				}
			}
		}

		
	}
}

// shows a message below the username input, color is optional and will default to black
function showMessage(message, color) {
	var messageContainer = document.querySelector("#messageContainer");
	var textNode = document.createTextNode(message);

	while (messageContainer.firstChild) {
	    messageContainer.removeChild(messageContainer.firstChild);
	}
	
	messageContainer.appendChild(textNode);
	

	if(color != undefined) {
		messageContainer.style.color = color;
	} else {
		messageContainer.style.color = "black";
	}

	messageContainer.style.opacity = 1;

	if(hideTimeout != undefined) {
		clearTimeout(hideTimeout);
	}
	hideTimeout = setTimeout(function() {
		messageContainer.style.opacity = 0;
	}, 7000);
}

