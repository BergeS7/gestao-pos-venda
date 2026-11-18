"""
scripts/gerar-marca.py — Gera os arquivos da marca RevisOn usados pelo sistema

Fontes (em docs/marca/):
  revison-horizontal.png   logo horizontal, fundo transparente (2322x872)
  revison-horizontal.svg   mesma logo em vetor (texto em Arial Black)
  revison-selo.png         versão em selo redondo (não usada nas telas)

Este script grava em apps/web/public/marca/:

  logo.webp           logo horizontal → login e topo do menu lateral
  icone.png (256px)   botão de ligar vermelho (o "O" de RevisOn) → ícone da aba
  icone-180.png       mesmo ícone, 180px, com fundo branco → atalho na tela do celular

O ícone é DESENHADO aqui (não recortado da logo): o "O" da logo é inclinado e
encosta no "s" e no "n", e um recorte ficaria com pedaços das letras.

Como rodar (precisa do Pillow: pip install pillow), a partir da raiz do repo:
  python scripts/gerar-marca.py

Rode de novo sempre que a logo mudar.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ORIGINAL = RAIZ / "docs" / "marca" / "revison-horizontal.png"
DESTINO = RAIZ / "apps" / "web" / "public" / "marca"

# Vermelho da marca (o mesmo da logo e de $primary no Sass)
VERMELHO = (221, 32, 38, 255)

# Largura final da logo: o dobro do maior tamanho exibido na tela, para ficar
# nítida em telas de alta densidade (celulares, notebooks retina).
LARGURA_LOGO = 720


def recortar(img: Image.Image, margem: int = 8) -> Image.Image:
    """Corta a parte transparente em volta do desenho, deixando uma margem."""
    x0, y0, x1, y1 = img.getchannel("A").getbbox()
    return img.crop((max(x0 - margem, 0), max(y0 - margem, 0), x1 + margem, y1 + margem))


def botao_de_ligar(lado: int, fundo: tuple[int, int, int, int] = (0, 0, 0, 0)) -> Image.Image:
    """
    Desenha o símbolo de ligar (anel aberto em cima + barra) num quadrado.

    Desenha 4x maior e reduz no fim (supersampling), para as bordas ficarem lisas.
    As pontas do anel e da barra são arredondadas, como na logo.
    """
    s = lado * 4
    img = Image.new("RGBA", (s, s), fundo)
    d = ImageDraw.Draw(img)

    cx, cy = s / 2, s * 0.55  # centro do anel um pouco abaixo do meio (a barra sobe)
    raio = s * 0.33  # raio da linha central do anel
    espessura = s * 0.13
    abertura = 50  # graus livres no topo do anel, metade para cada lado

    # Anel: no Pillow o ângulo 0 aponta para a direita e cresce no sentido horário;
    # o topo é 270°.
    inicio, fim = 270 + abertura, 270 - abertura + 360
    caixa = (cx - raio - espessura / 2, cy - raio - espessura / 2, cx + raio + espessura / 2, cy + raio + espessura / 2)
    d.arc(caixa, inicio, fim, fill=VERMELHO, width=round(espessura))

    # Pontas redondas do anel
    for ang in (inicio, fim):
        r = math.radians(ang)
        px, py = cx + raio * math.cos(r), cy + raio * math.sin(r)
        d.ellipse((px - espessura / 2, py - espessura / 2, px + espessura / 2, py + espessura / 2), fill=VERMELHO)

    # Barra vertical, do alto do quadrado até perto do centro do anel
    topo, base = s * 0.1, cy - raio * 0.05
    d.line((cx, topo, cx, base), fill=VERMELHO, width=round(espessura))
    for py in (topo, base):
        d.ellipse((cx - espessura / 2, py - espessura / 2, cx + espessura / 2, py + espessura / 2), fill=VERMELHO)

    return img.resize((lado, lado), Image.LANCZOS)


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    original = Image.open(ORIGINAL).convert("RGBA")

    # Logo horizontal
    logo = recortar(original)
    altura = round(logo.height * LARGURA_LOGO / logo.width)
    logo = logo.resize((LARGURA_LOGO, altura), Image.LANCZOS)
    logo.save(DESTINO / "logo.webp", quality=90)
    print(f"logo.webp: {logo.width}x{logo.height}")

    # Ícone da aba: fundo transparente (fica bom em abas claras e escuras)
    botao_de_ligar(256).save(DESTINO / "icone.png", optimize=True)
    # Atalho do celular: o iPhone preenche a transparência de preto, então usa fundo branco
    botao_de_ligar(180, fundo=(255, 255, 255, 255)).save(DESTINO / "icone-180.png", optimize=True)

    for f in sorted(DESTINO.iterdir()):
        print(f"{f.name}: {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
