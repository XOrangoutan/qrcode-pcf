const express = require('express');
const QRCode = require('qrcode');
const sharp = require('sharp');
const path = require('path');

const app = express();
const PORT = 3020;

app.use(express.urlencoded({ extended: true }));

// Formulaire HTML basique
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Générateur QR Code</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #ffffff; color: #333; }
                form { background: white; padding: 20px; border-radius: 8px; max-width: 400px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .field { margin-bottom: 15px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input[type="text"], input[type="color"], input[type="file"] { width: 100%; padding: 8px; box-sizing: border-box; }
                button { background: #e4002b; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px; width: 100%; }
                button:hover { background: #c80024; }
            </style>
        </head>
        <body>
            <h1>Générateur de QR Code</h1>
            <form id="qrForm" action="/generate" method="POST">
                <div class="field">
                    <label>URL / Texte :</label>
                    <input type="text" name="text" required value="https://www.pcf.fr">
                </div>
                <div class="field">
                    <label>Couleur des cases (Hex) :</label>
                    <select name="color">
                        <option value="#000000" selected>Noir</option>
                        <option value="#e4002b" selected>Rouge PCF</option>
                    </select>
                </div>
                <div class="field">
                    <label>Taille du QR</label>
                    <select name="size">
                        <option value="200">200x200</option>
                        <option value="300">300x300</option>
                        <option value="400">400x400</option>
                        <option value="500">500x500</option>
                        <option value="600" selected="selected">600x600</option>
                        <option value="1200" selected="selected">1200x1200</option>
                    </select>
                </div>
                <button type="submit">Générer</button>
            </form>
            <div style="margin-top: 30px;display:none;" id="resultSection">
                <h3>Votre QR Code :</h3>
                <div id="resultContainer">Aucun QR code généré pour l'instant.</div>
            </div>

            <script>
                document.getElementById('qrForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const resultSection = document.getElementById('resultSection');
                    resultSection.style.display = 'block';
                    const container = document.getElementById('resultContainer');
                    container.innerHTML = 'Génération en cours...';

                    const formData = new FormData(e.target);
                    
                    try {
                        const response = await fetch('/generate', {
                            method: 'POST',
                            body: new URLSearchParams(formData)
                        });

                        if (!response.ok) throw new Error('Erreur serveur');

                        const blob = await response.blob();
                        const imageUrl = URL.createObjectURL(blob);

                        container.innerHTML = \`<img src="\${imageUrl}" alt="QR Code généré" style="border:1px solid #ccc; max-width:100%;">\`;
                    } catch (err) {
                        container.innerHTML = 'Erreur lors de la génération.';
                    }
                });
            </script>
            </body>
        </html>
    `);
});

// Traitement de la génération
app.post('/generate', async (req, res) => {
    try {
        const { text, color, size } = req.body;

        let logoCentral = color === '#e4002b' ? path.join(__dirname, '..', 'resources', 'logopcfrouge.svg') : path.join(__dirname, '..', 'resources','logopcfnoir.svg');
        let logoSize = Math.round(size*0.2); // 20% de la taille du QR code
        let logoOffset = Math.round((size - logoSize) / 2); // Centrage du logo

        // 1. Génération du QR code à la dimension choisie avec un niveau de correction d'erreur 'H' (30%) 
        // indispensable pour masquer le centre sans perdre la lisibilité.
        const qrBuffer = await QRCode.toBuffer(text, {
            errorCorrectionLevel: 'H',
            type: 'png',
            width: size ? parseInt(size) : 600,
            margin: 2,
            color: {
                dark: color,
                light: "#ffffff"
            }
        });

        // 2. Redimensionnement du logo en 120x120 pixels
        const resizedLogo = await sharp(logoCentral)
            .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .toBuffer();

        // 3. Fusion : superposition du logo au centre (position X=240, Y=240 pour une image de 600x600)
        const finalImage = await sharp(qrBuffer)
            .composite([{ input: resizedLogo, left: logoOffset, top: logoOffset }])
            .png()
            .toBuffer();

        // Envoi de l'image finale au navigateur
        res.setHeader('Content-Type', 'image/png');
        res.send(finalImage);

    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur interne du serveur.');
    }
});

app.listen(PORT, () => {
    console.log(`Serveur actif sur http://localhost:${PORT}`);
});