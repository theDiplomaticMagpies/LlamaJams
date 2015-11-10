var React = require('react');
var Search = require('./Search');
var Song = require('./Song');
var Player = require('./Player');
var Firebase = require('firebase');


var SongEntry = React.createClass({

  // Sets the initial playlist code to an empty string
  getDefaultProps: function() {
    return {
      playlistCode: ''
    }
  },

  getInitialState: function(){
    return {
      songs: [],
      active: false,
      input: '',
      searchResults: [],
      toggle: false,
      hasToken: false
    }
  },

  // This function fetches the right playlist from Firebase based on
  // your playlist code.
  loadSongsFromServer: function(receivedCode) {
    this.items = [];
    this.firebaseRef = new Firebase('https://lldjmagpie.firebaseio.com/' + receivedCode + '/playlist');

    this.firebaseRef.on('child_added', function(snapshot) {
      var eachSong = snapshot.val();
      var eachTitle = eachSong.title;
      var eachVoteUp = eachSong.voteUp;
      var eachVoteDown = eachSong.voteDown;
      var eachKey = snapshot.key();
      var eachDuration = eachSong.duration;
      var eachImg = eachSong.artwork_url;
      // Pushes each song into the items array for rendering
      var eachVoteSum = eachVoteUp - eachVoteDown;
      var duration = eachDuration;
      var artwork_url = eachImg;
      this.items.push({
        song: eachTitle,
        songUrl: eachSong.songUrl,
        key: eachKey,
        voteUp: eachVoteUp,
        voteDown: eachVoteDown,
        voteSum: eachVoteSum,
        duration: duration,
        artwork_url: artwork_url,
        isPlaying: false
      });
      this.setState({songs: this.items})
    }.bind(this));
  },

  // This rerenders the playlist every time a song is removed from Firebase
  rerenderPlaylist: function() {
    this.firebaseRef.on('child_removed', function(snapshot) {
      var removeSongbyUrl = snapshot.val().songUrl;
      var isFound = false;
      // Loops through the songs array and removes the deleted song
      // from firebase to control rendering for react
      for(var i = 0; i < this.state.songs.length; i++) {
        if(this.state.songs[i].songUrl === removeSongbyUrl && !isFound) {
          this.state.songs.splice(i,1)
          isFound = true;
        }
      }
      // Resets the state to accurately reflect removed items
      this.setState({songs: this.state.songs});
      this.forceUpdate();
    }.bind(this));
  },

  componentWillReceiveProps: function(nextProps) {
    this.state.hasToken = nextProps.hasToken;
    var receivedCode = nextProps.playlistCode;
    this.loadSongsFromServer(receivedCode);
    this.rerenderPlaylist();
  },

  handleSearchInput: function(inputSearch) {
    this.setState({
      input: inputSearch
    });
    this.toggleBox();
    this.soundCloudCall(inputSearch);
  },

  toggleBox: function() {
    this.setState({
      active: !this.state.active
    })
  },

  // This function adds songs to firebase
  pushSong: function(e) {
    var selectedSong = e.target.childNodes[0].data;
    var allResults = this.state.searchResults;
    var alreadyDidOnce = false;
    for(var i = 0; i < allResults.length; i++) {
      if(!alreadyDidOnce){
        if(allResults[i].title === selectedSong) {
          this.firebaseRef.push({
            title: allResults[i].title,
            songUrl: allResults[i].songUrl,
            voteUp: 0,
            voteDown: 0,
            voteSum: 0,
            duration: allResults[i].duration,
            isPlaying: false
          });
          alreadyDidOnce = true;
        }
      }
    }
   this.toggleBox();
   e.preventDefault();
  },

  // Controls the play and pause functionality of the music player
  playPause: function() {
    var fbref = this.firebaseRef;
    var songs = this.state.songs;
    var player = this;

    var myOptions = {
      onload : function() {
        //PUT TIMER HERE
    var duration = Math.floor(this.duration/1000)*1000;

      if(player.state.toggle){
      this.clearInterval(startTime)
      }
      var startTime = setInterval(function(){
    var minutes = Math.floor(duration/ (60 * 1000));
    var seconds = ((duration % 60000) / 1000).toFixed(0)
      if(!player.state.toggle){
      console.log(duration)
        if(seconds < 10){
      $('.Timerbox').html(minutes + ":" + '0' + seconds);
    }else{$('.Timerbox').html(minutes + ":" + seconds)};
      duration -= 1000;
      if(duration === 0){this.clearInterval(startTime)};
      }
      }, 1000);
      },
     onfinish : function(){
        // Removes first song after it's done playing
        fbref.child(player.state.songs[0].key).remove();
        // Play firstSong
        SC.stream(player.state.songs[0].songUrl, myOptions, function(song) {
          song.play();
          player.state.songs[0].isPlaying = true;
          fbref.child(player.state.songs[0].key).update({
            'isPlaying':'true'
          });
        });
      }
    };
    // If there's no current soundManager object, create one
    if(!window.soundManager){
      SC.stream(player.state.songs[0].songUrl, myOptions, function(song) {
        song.play();
        player.state.songs[0].isPlaying = true;
        fbref.child(player.state.songs[0].key).update({
          'isPlaying':'true'
        });
      })
    }else{
      if(this.state.toggle){
        this.setState({
          toggle: false
        })
        window.soundManager.resumeAll();
      }else{
        this.setState({
          toggle: true
        })
        window.soundManager.pauseAll();
      }
    }
  },


  // Controls the searching and displaying of results from the SoundCloud API
  soundCloudCall: function(inputSearch) {
    if(this.state.searchResults.length > 0) {
      this.setState({ searchResults: this.state.searchResults.slice(0) })
      this.forceUpdate();
    }
    SC.get('http://api.soundcloud.com/tracks/', { q: inputSearch, limit: 7 }, function(tracks) {
    // Display each song title and an option to add '+' to host playlist
      var array = [];

      for(var i = 0; i < tracks.length; i++) {
        var eachSong = tracks[i].title;
        var eachUrl = tracks[i].uri;
        var eachDur = tracks[i].duration;
        var eachImg = tracks[i].artwork_url;
        array.push({
          title: eachSong,
          songUrl: eachUrl,
          duration: eachDur,
          artwork: eachImg
        });
       }
      this.setState({
        searchResults: array
      })
   }.bind(this));
  },

  handleOnThatClickUp: function(arg) {
    for (var i = 0; i < this.state.songs.length; i++) {
      if (arg.key === this.state.songs[i].key) {
        this.state.songs[i].voteUp++;
        this.state.songs[i].voteSum = this.state.songs[i].voteUp - this.state.songs[i].voteDown;
        
        this.firebaseRef.child(arg.key).update({
          'voteUp': this.state.songs[i].voteUp,
          'voteSum': this.state.songs[i].voteSum
        });

        this.rearrangeItTheRightWay();
        this.forceUpdate();
      }
    }
    
  },


  handleOnThatClickDown: function(arg) {
    var alreadyDidOnce = false;
    for (var i = 0; i < this.state.songs.length; i++) {
      if (arg.key === this.state.songs[i].key && !alreadyDidOnce) {
        this.state.songs[i].voteDown++;
        this.state.songs[i].voteSum = this.state.songs[i].voteUp - this.state.songs[i].voteDown;

        this.firebaseRef.child(arg.key).update({
          'voteDown': this.state.songs[i].voteDown,
          'voteSum': this.state.songs[i].voteSum
        });

        alreadyDidOnce = true;
        this.rearrangeItTheRightWay();
        this.forceUpdate();
      }
    }
  },

   handleOnThatDeleteClick: function(arg) {
    for (var i = 0; i < this.state.songs.length; i++) {
      if (i !== 0 && arg.key === this.state.songs[i].key) {
        this.state.songs.splice(i,1);
        this.firebaseRef.child(arg.key).remove();
        this.rearrangeItTheRightWay();
        this.forceUpdate();
      }
    }
  },

  rearrangeItTheRightWay: function() {
    var somethingIsActuallyPlaying = false;
    for (var k = 0; k < this.state.songs.length; k++) {
      if (this.state.songs[k].isPlaying) {
        var theOneThatsPlaying = this.state.songs.splice(k,1)[0];
        somethingIsActuallyPlaying = true;
      }
    }
    this.state.songs.sort(function(a, b) {return b.voteSum-a.voteSum});
    if (somethingIsActuallyPlaying) {
      this.state.songs.unshift(theOneThatsPlaying);
    }
  },

render: function(){
    var context = this;
    var songResults = this.state.searchResults.map(function(song, i) {
      var songUri = song.songUrl
      return <a className='song-results' key={i} href='#' ref='eachSoundcloud' value={songUri}> {song.title} <div className='plus'>+</div></a>
    });
    var songStructure = this.state.songs.map(function(song, i) {
      return <Song data={song} key={i} onThatClickUp={context.handleOnThatClickUp} onThatClickDown={context.handleOnThatClickDown} onThatDeleteClick={context.handleOnThatDeleteClick} />
    });
    if(this.state.active) {
      var display = {
        display: 'block'
      }
    } else {
      var display = {
        display: 'none' 
      }
    }
    return (
      <div>
       {this.state.hasToken ? <Player togglePlayer={this.playPause}/> : null}
        <Search checkClick={this.handleSearchInput}/>
        <div className='Timerbox'></div>
        <div className='soundcloud-results' style={display}>
          <div className='song-results' onClick={this.pushSong}>
            {songResults}
          </div>
        </div>
       {songStructure}
      </div>
    );
   },

  componentDidMount: function() {
    var jwt = window.localStorage.getItem('token');
    if (this.props.playlistCode.length > 0 && !jwt) {
      this.loadSongsFromServer(this.props.playlistCode);
      this.rerenderPlaylist();
    }
  }
});

module.exports = SongEntry;
