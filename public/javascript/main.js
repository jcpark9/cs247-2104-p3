// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {
  var cur_video_blob = [null, null, null, null, null];

  $(document).ready(function(){
    console.log(0.8 * $(window).height());
    $("#conversation").height(0.7 * $(window).height());
    $("#placeholder").css('left',(($("#you").width() - 320)/2 - 5));

    $("input").focus(function() {
      $(this).val("");
    });

    connect_to_chat_firebase();
    connect_webcam();
  });

  function connect_to_chat_firebase(){
    var users = [];

    /* Include your Firebase link here!*/
    var fb_instance = new Firebase("https://jcpark9-p3.firebaseio.com/");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    $("#chatURL").html("Share this url with your friend to join this chat: <span id='url'>"+ document.location.origin+"/#"+fb_chat_room_id+"</span>");

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var fb_instance_video = fb_new_chat_room.child('videos');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    var username = window.prompt("Welcome, warrior! please declare your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    fb_instance_video.child(username).on("child_added",function(snapshot){
      playVideo(snapshot.val());
    });

    fb_instance_users.on('child_added', function(snapshot) {
      users.push(snapshot.val().name);
    });

    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        /*if(has_emotions($(this).val())){
          fb_instance_stream.push({m:username+": " +$(this).val(), v:cur_video_blob, c: my_color});
        }else{
        */
          fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
        //}
        $(this).val("");
      }
    });

    $(".send").click(function() {
      var index = ($(this).parent().attr('id'));

      if (cur_video_blob[index] != null) {
        users.forEach(function(user) {

          if (user != username) {
            console.log ("sent to " + user);
            fb_instance_video.child(user).push({v: cur_video_blob[index]});
          }
        });
      }
    });
  }

  var timer;
  // creates a message node and appends it to the conversation
  function display_msg(data){
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    if(data.v){
      $("#response video").remove();
      $("#placeholder").unbind();
      clearTimeout(timer);
      // for video element
      var video = document.createElement("video");
      video.autoplay = true;
      video.controls = false; // optional
      video.loop = true;
      video.width = 320;

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      video.appendChild(source);

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));
      console.log("hello");
      document.getElementById("response").appendChild(video);
      $("#placeholder").slideUp();
      timer = setTimeout(function() {
          $("#placeholder").slideDown();
      }, 10000);
      
    }

    var objDiv = document.getElementById("conversation");
    objDiv.scrollTop = objDiv.scrollHeight;

    // Scroll to the bottom every time we display a new message
    scroll_to_bottom(0);
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("#conversation").animate({ scrollTop: $("#conversation").scrollHeight }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      //webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          src: URL.createObjectURL(stream),
          width: 320,
          height: 240
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      var time = 0;
      var second_counter = document.getElementById('second_counter');
      var second_counter_update = setInterval(function(){
        second_counter.innerHTML = time++;
      },1000);

      $(".rec").click(function() {
        var index = ($(this).parent().attr('id')).replace("emoticon", "");
        console.log(index);
        // now record stream in 5 seconds interval
        var video_container = document.getElementById('video_container');
        var mediaRecorder = new MediaStreamRecorder(stream);

        mediaRecorder.mimeType = 'video/webm';
        // mediaRecorder.mimeType = 'image/gif';
        // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
        mediaRecorder.video_width = 320;
        mediaRecorder.video_height = 240;

        mediaRecorder.ondataavailable = function (blob) {
            //console.log("new data available!");
            video_container.innerHTML = "";

            // convert data into base 64 blocks
            blob_to_base64(blob,function(b64_data){
              cur_video_blob[index] = b64_data;
              console.log(cur_video_blob);
            });

            var video = document.createElement("video");
            video.autoplay = true;
            video.controls = false; // optional
            video.loop = true;
            video.width = 100;

            var source = document.createElement("source");
            source.src =  URL.createObjectURL(blob);
            source.type =  "video/webm";

            video.appendChild(source);
            console.log("#emoticon" + index + " .thumbnail");
            $("#emoticon" + index + " .thumbnail img").remove();
            $("#emoticon" + index + " .thumbnail").append(video);
        };
      
        mediaRecorder.stop();
        mediaRecorder.start(7000);
        var fade = setInterval(function() {
          $("#recordsign").fadeIn();
          $("#recordsign").fadeOut();
        },1000);

        $("#time").text(7);
        $(".timer").animate({opacity: 1},1000);

        var tick = setInterval(function() {
          var sec = parseInt($("#time").text());
          if (sec == 1) {
            $(".timer").animate({opacity: 0},1000);
            clearInterval(tick);
            clearInterval(fade);
          }
          $("#time").text(sec-1);
        }, 1000);
        
      });

      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  function playVideo(data) {
    var vid = data.v;
    $("#response video").remove();
    $("#placeholder").unbind();
    clearTimeout(timer);
    // for video element
    var video = document.createElement("video");
    video.autoplay = true;
    video.controls = false; // optional
    video.loop = true;
    video.width = 320;

    var source = document.createElement("source");
    source.src =  URL.createObjectURL(base64_to_blob(vid));
    source.type =  "video/webm";

    video.appendChild(source);

    // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
    // var video = document.createElement("img");
    // video.src = URL.createObjectURL(base64_to_blob(data.v));
    console.log("hello");
    document.getElementById("response").appendChild(video);
    $("#placeholder").slideUp();
    timer = setTimeout(function() {
        $("#placeholder").slideDown();
    }, 7000);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    var options = ["lol",":)",":("];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        return true;
      }
    }
    return false;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
