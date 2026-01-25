export type Database_CustomResponse = {
    success: boolean;
    message: string;
    data: any;
}

export type FilterOrderByTypes = "price_asc" | "price_desc" |"alphabetic" | "default" | "date" | "random";        //Si se cambia algo de acá cambiar también el tipo en el back

export type Nota = {
    id?: number,
    titulo?: string,
    slug?: string,
    fecha?: string,
    intro?: string,
    descripcion?: string,
    foto?: string,
    thumbnail?: string,
};

export type Rubro = "particular" | "Revendedor" | "comerciante";

export type Usuario = {
    id?: number,
    login?: string,
    password?: string,
    nombre?: string,
    apellido?: string,
    empresa?: string,
    rubro?: Rubro,
    direccion?: string,
    cp?: string,
    ciudad?: string,
    provincia?: string,
    pais?: string,
    telefono?: string,
    email?: string,
    permisos?: "0" | "10",
    codigo?: string,
    fecha_alta?: Date,
    newsletter?: 0 | 1,    
    habilitado?: "0" | "1",    
    token?: string,
    celular?: string,
    donde_conociste?: string,
    primer_pedido?: 0 | 1,                                      //Por defecto "primer_pedido" = 1, cuando se hace el primer pedido "primer_pedido" = 0 (se pasa a cero) 
    habilitado_pdj?: "0" | "1",
    reviews_send?: number,
    iva?: "CF" | "MO" | "RI" | null,
    cuit?: number,  
    razon?: string,
    subdominio?: string,
    dominio?: string,
    envio_nombre?: string,
    envio_dni?: string,
    envio_localidad?: string,
    envio_provincia?: string,
    envio_cp?: string,
    envio_telefono?: string,
    envio_direccion?: string,
    envio_tipo?: "D" | "S",
    login_adj2?: string,
    fecha_login_adj2?: Date,
    vendedor?: number | string,
    dolar?: "1" | "2",
};

export type Producto = {
    id: number,
    categoria: number,
    codigo: string,
    nombre: string,
    descripcion: string,
    foto1: string,
    foto2: string,
    fecha_alta: string,
    precio: number,
    // stock: number,
    colecciones: "0" | "1",
    estado: "0" | "1",
    automatico: "0" | "1",
    precioCalculado: number,
    marca: number,
    order: number,
    id_grupo: number,
    notificado: "0" | "1",
    con_descuento: boolean;
	porcentaje_descuento: number;
	precio_full: number;

    thumbnail1: string,                 //Campos que agrega la API para el front
    thumbnail2: string,                 
    foto1NameToDelete: string,
    foto2NameToDelete: string,
    precioDolar: number,
}

export type Pano = {
    id: number,
    nombre: string,
}

export type Panoxproducto = {
    id_producto: number,
    id_pano: number,
}

export type Marca = {
    id: number,
    orden: number,
    descripcion: string,
    fecha: string,
    imagen: string,
    pdf: string,
    pdf_recomendado: string,
    link: string,
    solapa: "0" | "1",
    estado: "0" | "1",
    logo: string,

    thumbnailImagen: string;             //Campos que agrega la API para el front
    thumbnailLogo: string;
    imagenNameToDelete: string,             
    logoNameToDelete: string,

    pdfName: string,
    pdfNameToDelete: string,
    pdfRecomendadoName: string,
    pdfRecomendadoNameToDelete: string,
}

export type Metodo_envio = {
    id: number,
    nombre: string,
}

export type Novedad = {
    id: number,
    id_producto: number,
    titulo: string,
    subtitulo: string,
    descripcion: string,
    carrousel: "0" | "1",
    slug: string,
    meta_title: string,
    habilitada: "0" | "1",
}

export type NewsProducto = Pick<Producto, "id" | "foto1" | "nombre">;

export type Reviews = {
    id: number,
    author_name: string,
    author_url: string,
    profile_photo_url: string,
    language: string,
    rating: number,
    relative_time_description: string,
    text: string,
    time: number,
    added: number,
    control: string,
    show: "0" | "1",
}

export type System_config = {
    id: number,
    config: string,
    value: string,
    label: string,
}

export type Categoria = {
    id: number,
    nombre: string,
    orden: number,
}

export type Multiplicador = {
    id: number,
    valor: number,
    activo:  "Y" | "N",
}














