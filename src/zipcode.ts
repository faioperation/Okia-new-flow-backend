import axios from "axios";

async function getLatLng(postcode : any ) {
  try {
    const res = await axios.get(`https://api.postcodes.io/postcodes/${postcode}`);
    
    const { latitude, longitude } = res.data.result;
    
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);
  } catch (err : any) {
    console.error("Error:", err.message);
  }
}

getLatLng("EC3A 5DE");