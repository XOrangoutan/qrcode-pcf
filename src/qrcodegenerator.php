<?php
require_once __DIR__ . '/../vendor/autoload.php';

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: image/png');

    $text =$_POST['text'] ?? 'https://www.pcf.fr';
    $color =$_POST['color'] ?? '#000000';
    $size = (int)($_POST['size'] ?? 600);

    // Sélection du logo selon la couleur des cases
    $logoFile = ($color === '#e4002b') ? 'logopcfrouge.svg' : 'logopcfnoir.svg';
    $logoPath = __DIR__ . '/../resources/' .$logoFile;

    // 1. Génération du QR code brut avec un niveau de correction H (30%)
    $options = new QROptions([
        'version'    => QRCode::VERSION_AUTO,
        'outputType' => QRCode::OUTPUT_IMAGE_PNG,
        'eccLevel'   => QRCode::ECC_H,
        'scale'      => 10,
    ]);

    $qrData = (new QRCode($options))->render($text);

    // 2. Traitement de l'image via Intervention Image
    $manager = new ImageManager(new Driver());
    
    $qrImage =$manager->read($qrData);$qrImage->resize($size,$size);

    // Calcul de la taille du logo (20% de la largeur du QR) et du centrage
    $logoSize = (int)round($size * 0.2);$logoOffset = (int)round(($size -$logoSize) / 2);

    // Chargement et redimensionnement du logo vectoriel
    $logo =$manager->read($logoPath);$logo->resize($logoSize,$logoSize);

    // Fusion au centre
    $qrImage->place($logo, 'top-left', $logoOffset,$logoOffset);

    echo $qrImage->toPng();
    exit;
}
?>
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
        input[type="text"], select { width: 100%; padding: 8px; box-sizing: border-box; }
        button { background: #e4002b; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px; width: 100%; }
        button:hover { background: #c80024; }
    </style>
</head>
<body>
    <h1>Générateur de QR Code</h1>
    <form id="qrForm" method="POST">
        <div class="field">
            <label>URL / Texte :</label>
            <input type="text" name="text" required value="https://www.pcf.fr">
        </div>
        <div class="field">
            <label>Couleur des cases :</label>
            <select name="color">
                <option value="#000000">Noir</option>
                <option value="#e4002b" selected>Rouge PCF</option>
            </select>
        </div>
        <div class="field">
            <label>Taille du QR :</label>
            <select name="size">
                <option value="200">200x200</option>
                <option value="300">300x300</option>
                <option value="400">400x400</option>
                <option value="500">500x500</option>
                <option value="600" selected>600x600</option>
                <option value="1200">1200x1200</option>
            </select>
        </div>
        <button type="submit">Générer</button>
    </form>

    <div style="margin-top: 30px; display: none;" id="resultSection">
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
                const response = await fetch('', {
                    method: 'POST',
                    body: new URLSearchParams(formData)
                });

                if (!response.ok) throw new Error('Erreur serveur');

                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);

                container.innerHTML = `<img src="${imageUrl}" alt="QR Code généré" style="border:1px solid #ccc; max-width:100%;">`;
            } catch (err) {
                container.innerHTML = 'Erreur lors de la génération.';
            }
        });
    </script>
</body>
</html>