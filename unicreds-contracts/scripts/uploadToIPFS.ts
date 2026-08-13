import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables (Secret Token)
dotenv.config();

const PINATA_JWT = process.env.PINATA_JWT;

async function uploadFileToIPFS(filePath: string) {
    try {
        console.log("Connecting to Pinata servers...");

        // Prepare the file for upload
        const data = new FormData();
        data.append("file", fs.createReadStream(filePath));

        // Add metadata to organize the file in Pinata dashboard
        const metadata = JSON.stringify({
            name: "Test_Student_Certificate",
        });
        data.append("pinataMetadata", metadata);

        // Send the file to the IPFS network via Pinata
        const response = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            data,
            {
                headers: {
                    "Authorization": `Bearer ${PINATA_JWT}`,
                },
            }
        );

        console.log("File uploaded successfully!");
        console.log("The file's CID is:", response.data.IpfsHash);
        console.log("File view link: https://gateway.pinata.cloud/ipfs/" + response.data.IpfsHash);

    } catch (error) {
        console.error("Error occurred during upload:", error);
    }
}

// Execute the upload operation on the test.pdf file
const filePath = "./test.pdf"; 
uploadFileToIPFS(filePath);
