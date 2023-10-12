import * as React from "react";
import { has } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCirclePlus, faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { ToastMsg } from "../notifications/Notifications";
import { PLAYLIST_URI_PREFIX,  listenToJSPFTrack } from "../playlists/utils";
import GlobalAppContext from "../utils/GlobalAppContext";
import { getTrackName } from "../utils/utils";
import CreateOrEditPlaylistModal from "../playlists/CreateOrEditPlaylistModal";

type AddToPlaylistProps = {
    listen: Listen | JSPFTrack;
}

export default NiceModal.create((props: AddToPlaylistProps) => {
    const modal = useModal();
  
    const closeModal = React.useCallback(() => {
      modal.hide();
      setTimeout(modal.remove, 500);
    }, [modal]);
  
    const { listen } = props;
    const { APIService, currentUser } = React.useContext(GlobalAppContext);
    const [playlists, setPlaylists] = React.useState<Array<JSPFObject>>([]);
    
    React.useEffect(()=>{
        async function loadPlaylists() {
            try {
                const response = await APIService.getUserPlaylists(
                    currentUser?.name,
                    currentUser?.auth_token,
                    0,
                    0,
                    false,
                    false,
                );
                
                if(!response){
                    return;
                }
                const { playlists: existingPlaylists} = response;
                setPlaylists(existingPlaylists);
                window.sessionStorage.setItem("listenbrainz_playlists", JSON.stringify(existingPlaylists));
            } catch (error) {
                toast.error(
                    <ToastMsg
                    title="Error loading playlists"
                    message={error?.message ?? error}
                    />,
                    { toastId: "load-playlists-error" }
                );
            }
        }
        try {
            // First, try to load playlists from sessionStorage
            const storedPlaylists = window.sessionStorage.getItem("listenbrainz_playlists");
            if(storedPlaylists){
                setPlaylists(JSON.parse(storedPlaylists));
                return;
            }
        } catch (error) {
            // There was an issue parsing the stored playlists
            // Ignore the issue and load playlists as if there were none stored
            console.error(error);
        }

        if(currentUser?.auth_token){
            loadPlaylists();
        }
    }, [APIService,currentUser]);

    const addToPlaylist = React.useCallback(async (event:React.MouseEvent<HTMLButtonElement>)=>{
        try {
            if(!currentUser?.auth_token){
                throw new Error("You are not logged in");
            }
            const { currentTarget } = event;
            const { name:playlistName } = currentTarget;
            const playlistIdentifier = currentTarget.getAttribute("data-playlist-identifier");
            let trackToSend;
            if(has(listen,"title")){
                trackToSend = listen as JSPFTrack;
            } else {
                trackToSend = listenToJSPFTrack(listen as Listen);
            }
            if( !playlistIdentifier){
                throw new Error(`No identifier for playlist ${playlistName}`);
            }
            const playlistId = playlistIdentifier?.replace(PLAYLIST_URI_PREFIX, "");
            const status =  await APIService.addPlaylistItems(currentUser.auth_token,playlistId,[trackToSend]);
            if (status === 200){
                toast.success(<ToastMsg title="Added track" message={
                    <>
                        Successfully added <i>{trackToSend.title}</i> to playlist <a
                        href={playlistIdentifier}>
                            {playlistName}
                        </a>
                    </>
                } />, {
                    toastId: "success-add-track-to-playlist",
                });
            } else {
                throw new Error("Could not add track to playlist");
            }
        } catch (error) {
            toast.error(<ToastMsg title="Error adding track to playlist" message={
                <>
                    Could not add track to playlist:<br/>
                    {error.toString()}
                </>
            } />, {
                toastId: "error-add-track-to-playlist",
              });
        }
    },[listen,currentUser.auth_token]);

    const createPlaylist = React.useCallback(async()=>{
        let trackToSend;
        if(has(listen,"title")){
            trackToSend = listen as JSPFTrack;
        } else {
            trackToSend = listenToJSPFTrack(listen as Listen);
        }
        NiceModal.show(CreateOrEditPlaylistModal, { initialTracks: [trackToSend]});
        closeModal();
    },[listen]);
    
    const trackName = getTrackName(listen)
    return (
        <div
          className={`modal fade ${modal.visible ? "in" : ""}`}
          id="AddToPlaylistModal"
          tabIndex={-1}
          role="dialog"
          aria-labelledby="AddToPlaylistLabel"
          data-backdrop="static"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
                <div className="modal-header">
                    <button
                    type="button"
                    className="close"
                    data-dismiss="modal"
                    aria-label="Close"
                    onClick={closeModal}
                    >
                    <span aria-hidden="true">&times;</span>
                    </button>
                    <h4
                    className="modal-title"
                    id="AddToPlaylistLabel"
                    style={{ textAlign: "center" }}
                    >
                        <FontAwesomeIcon icon={faPlusCircle} /> Add to playlist 
                    </h4>
                </div>
                <div className="modal-body">
                    <p className="text-muted">Add the track <i>{trackName}</i> to one or more of your playlists below:</p>
                    <div className="list-group" style={{maxHeight: "50vh", overflow:"scroll"}}>
                        <button type="button"
                            className="list-group-item list-group-item-info"
                            data-dismiss="modal"
                            data-toggle="modal" data-target="#CreateOrEditPlaylistModal"
                            onClick={createPlaylist}
                            >
                            <FontAwesomeIcon icon={faFileCirclePlus} /> Create new playlist
                        </button>
                        {playlists?.map(jspfObject =>{
                            const {playlist} = jspfObject;
                            return (
                                <button type="button"
                                    key={playlist.identifier}
                                    className="list-group-item"
                                    name={playlist.title} data-playlist-identifier={playlist.identifier} onClick={addToPlaylist}>
                                    {playlist.title}
                                </button>
                            )
                        })}
                    </div>
                </div>
        
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-default"
                        data-dismiss="modal"
                        onClick={closeModal}
                    >
                        Close
                    </button>
                </div>
            </div>
          </div>
        </div>
      );
});