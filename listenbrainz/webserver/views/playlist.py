import ujson
from werkzeug.exceptions import BadRequest
from flask import Blueprint, render_template, current_app, request
from flask_login import current_user, login_required
from listenbrainz.domain import spotify

playlist_bp = Blueprint("playlist", __name__)


@playlist_bp.route("/", methods=["GET"])

def load_playlist():
    """Load a single playlist by id
    """

    # try:
    #     playlist_id = request.form['id']
    # except KeyError:
    #     return render_template(
    #         "playlists/playlist.html",
    #         error_msg="Missing form data key 'id'"
    #     )

    spotify_data = {}
    current_user_data = {}
    if current_user.is_authenticated:
        spotify_data = spotify.get_user_dict(current_user.id)

        current_user_data = {
                "id": current_user.id,
                "name": current_user.musicbrainz_id,
                "auth_token": current_user.auth_token,
        }

    props = {
        "current_user": current_user_data,
        "spotify": spotify_data,
        "api_url": current_app.config["API_URL"],
    }

    return render_template(
        "playlists/playlist.html",
        props=ujson.dumps(props)
    )