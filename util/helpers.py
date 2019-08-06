"""Helper functions"""


def parse_position(chrom_pos: str):
    """
    Convert a variant into chrom and position info

    Most urls in the app will specify the variant in some way- for now, we'll do the simplest thing and expect
    `chrom, pos`.
    """
    chrom, pos = chrom_pos.split('_')
    return chrom, int(pos)
