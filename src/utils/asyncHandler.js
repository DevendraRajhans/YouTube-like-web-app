// type 1 : using promise

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err))
    }
}

export {asyncHandler}


// const asyncHandler = () => {}
// const asyncHandler = (func) => { () => {} }
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}
// this is for understanding


// type 2 : using try catch
//
// const asyncHandler = (func) => async (req, res, next) => {
//     try{
//         await func(req, res, next)
//     } catch (err) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     } 
// }
//
// export {asyncHandler}
