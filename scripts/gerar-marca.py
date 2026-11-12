"""
scripts/gerar-marca.py — Gera os arquivos da logo usados pelo sistema

A logo original (fundo transparente, 2000x667) fica em
docs/marca/logo-original.webp. Este script recorta e redimensiona essa imagem
e grava em apps/web/public/marca/:

  logo.webp           logo completa, texto preto  → telas claras (login)
  logo-negativo.webp  logo completa, texto branco → menu lateral escuro
  icone.png (256px)   só o fone com o "M"         → ícone da aba do navegador
  icone-180.png       mesmo ícone, 180px          → atalho na tela do celular

Como rodar (precisa do Pillow: pip install pillow), a partir da raiz do repo:
  python scripts/gerar-marca.py

Rode de novo sempre que a logo original mudar.
"""

from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIGINAL = RAIZ / "docs" / "marca" / "logo-original.webp"
DESTINO = RAIZ / "apps" / "web" / "public" / "marca"

# Na original, o desenho (fone + círculo) vai até a coluna 808 e o texto
# "GESTÃO PÓS-VENDA" começa na 841: cortamos no meio do vão.
FIM_DO_ICONE = 825

# Largura final da logo completa: o dobro do maior tamanho exibido na tela,
# para ficar nítida em telas de alta densidade (celulares, notebooks retina).
LARGURA_LOGO = 720


def recortar(img: Image.Image, margem: int = 8) -> Image.Image:
    """Corta a parte transparente em volta do desenho, deixando uma margem."""
    x0, y0, x1, y1 = img.getchannel("A").getbbox()
    return img.crop((max(x0 - margem, 0), max(y0 - margem, 0), x1 + margem, y1 + margem))


def negativo(img: Image.Image) -> Image.Image:
    """
    Troca o preto (texto e fone) por branco, mantendo a transparência.
    Só mexe em pixels "cinza" (sem cor) e escuros: o vermelho do círculo e o
    "M" branco ficam como estão.
    """
    saida = img.copy()
    px = saida.load()
    for y in range(saida.height):
        for x in range(saida.width):
            r, g, b, a = px[x, y]
            sem_cor = max(r, g, b) - min(r, g, b) < 30
            if a and sem_cor and max(r, g, b) < 200:
                px[x, y] = (255, 255, 255, a)
    return saida


def quadrado(img: Image.Image, lado: int) -> Image.Image:
    """Centraliza a imagem num quadrado transparente de `lado` pixels."""
    img = img.copy()
    img.thumbnail((lado, lado), Image.LANCZOS)
    fundo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    fundo.paste(img, ((lado - img.width) // 2, (lado - img.height) // 2), img)
    return fundo


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    original = Image.open(ORIGINAL).convert("RGBA")

    # Logo completa, em versão clara e escura
    logo = recortar(original)
    altura = round(logo.height * LARGURA_LOGO / logo.width)
    logo = logo.resize((LARGURA_LOGO, altura), Image.LANCZOS)
    logo.save(DESTINO / "logo.webp", quality=90)
    negativo(logo).save(DESTINO / "logo-negativo.webp", quality=90)

    # Ícone: só a parte do desenho, sem o texto
    icone = recortar(original.crop((0, 0, FIM_DO_ICONE, original.height)), margem=4)
    quadrado(icone, 256).save(DESTINO / "icone.png", optimize=True)
    quadrado(icone, 180).save(DESTINO / "icone-180.png", optimize=True)

    for f in sorted(DESTINO.iterdir()):
        print(f"{f.name}: {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
