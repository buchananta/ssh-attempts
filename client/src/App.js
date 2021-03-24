import { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
//import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
const PORT = process.env.REACT_APP_PORT || 5478;

function App() {
  const [ attempts, setAttempts ] = useState({});

  useEffect(() => {
    axios.get(`http://trevorbuchanan.com:${PORT}/`)
      .then(res => {
        setAttempts(res.data);
      })
      .catch(err => {
        console.error(err);
    })
  }, []);


  return (
    <div className="App">
      <header className="App-header">
        <h1>
          Recent Ssh Access Attempts
        </h1>
      </header>
      <MapContainer center={[40.7128, -74.0060]} zoom={3} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {
          Object.keys(attempts).map(ip => (
            <Marker
              position={[
                attempts[ip].location.latitude,
                attempts[ip].location.longitude
              ]}
            >
              <Popup>
                {ip}
              </Popup>
            </Marker>
          ))
        }
      </MapContainer>
    </div>
  );
}

export default App;
