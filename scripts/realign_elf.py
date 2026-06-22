import struct
import sys

PAGE = 0x4000  # 16 KB
PT_LOAD = 1

def realign(path):
    try:
        with open(path, 'rb') as f:
            data = bytearray(f.read())
    except Exception as e:
        print(f"Failed to read {path}: {e}")
        return
    
    if len(data) < 64:
        return
        
    if data[:4] != b'\x7fELF' or data[4] != 2:  # ELF64 only
        return

    # ELF64 header layout
    e_phoff = struct.unpack_from('<Q', data, 32)[0]
    e_shoff = struct.unpack_from('<Q', data, 40)[0]
    e_phentsize, e_phnum, e_shentsize, e_shnum = struct.unpack_from('<HHHH', data, 54)

    # Read program headers
    phdrs = []
    for i in range(e_phnum):
        o = e_phoff + i * e_phentsize
        f = struct.unpack_from('<IIQQQQQQ', data, o)
        phdrs.append({'hdr': o, 'p_type': f[0], 'p_offset': f[2], 'p_vaddr': f[3], 'p_align': f[7]})

    # Read section headers
    shdrs = [{'idx': i, 'sh_offset': struct.unpack_from('<Q', data, e_shoff + i * e_shentsize + 24)[0]}
             for i in range(e_shnum)]

    # Sort LOAD segments by offset
    loads = sorted([p for p in phdrs if p['p_type'] == PT_LOAD], key=lambda p: p['p_offset'])
    
    inserts = []
    cum = 0
    for ld in loads:
        new_off = ld['p_offset'] + cum
        pad = (ld['p_vaddr'] % PAGE - new_off % PAGE) % PAGE
        if pad:
            inserts.append((ld['p_offset'], pad))
            cum += pad

    if not inserts:
        # Just bump alignment to 16KB if already satisfied
        changed = False
        for ph in phdrs:
            if ph['p_type'] == PT_LOAD and ph['p_align'] < PAGE:
                struct.pack_into('<Q', data, ph['hdr'] + 48, PAGE)
                changed = True
        if changed:
            with open(path, 'wb') as f:
                f.write(data)
            print(f"Alignment bumped to 16KB for {path}")
        return

    # Insert padding in reverse order
    for off, pad in sorted(inserts, reverse=True):
        data[off:off] = b'\x00' * pad

    def shift(orig):
        s = 0
        for ins_off, p in sorted(inserts):
            if ins_off <= orig:
                s += p
            else:
                break
        return s

    new_e_shoff = e_shoff + shift(e_shoff)
    struct.pack_into('<Q', data, 40, new_e_shoff)
    new_e_phoff = e_phoff + shift(e_phoff)
    if new_e_phoff != e_phoff:
        struct.pack_into('<Q', data, 32, new_e_phoff)

    for ph in phdrs:
        new_p_off = ph['p_offset'] + shift(ph['p_offset'])
        align = PAGE if ph['p_type'] == PT_LOAD else ph['p_align']
        pos = new_e_phoff + (ph['hdr'] - e_phoff)
        struct.pack_into('<Q', data, pos + 8, new_p_off)
        struct.pack_into('<Q', data, pos + 48, align)

    for sh in shdrs:
        if sh['sh_offset'] == 0:
            continue
        new_sh_off = sh['sh_offset'] + shift(sh['sh_offset'])
        struct.pack_into('<Q', data, new_e_shoff + sh['idx'] * e_shentsize + 24, new_sh_off)

    with open(path, 'wb') as f:
        f.write(data)
    print(f"Realigned {path} successfully (padded {cum} bytes)")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        realign(sys.argv[1])
